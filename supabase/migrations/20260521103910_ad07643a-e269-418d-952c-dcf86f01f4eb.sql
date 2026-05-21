
-- 1. restaurant_drivers table
CREATE TABLE IF NOT EXISTS public.restaurant_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

ALTER TABLE public.restaurant_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage drivers" ON public.restaurant_drivers
  FOR ALL TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Drivers see own row" ON public.restaurant_drivers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. helper
CREATE OR REPLACE FUNCTION public.is_restaurant_driver()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM restaurant_drivers WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.driver_restaurant_id(p_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT restaurant_id FROM restaurant_drivers WHERE user_id = p_user LIMIT 1
$$;

-- 3. orders columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS driver_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_meters integer;

-- 4. restaurants rate column
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS delivery_rate_per_100m numeric(10,4) NOT NULL DEFAULT 0.70;

-- 5. RLS for drivers on orders
CREATE POLICY "Drivers see delivery pool and own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    order_type = 'delivery'
    AND restaurant_id = public.driver_restaurant_id(auth.uid())
    AND (
      (driver_id IS NULL AND status = 'ready')
      OR driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- 6. claim function
CREATE OR REPLACE FUNCTION public.claim_delivery_order(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_rid uuid; BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT restaurant_id INTO v_rid FROM restaurant_drivers WHERE user_id = v_uid LIMIT 1;
  IF v_rid IS NULL THEN RAISE EXCEPTION 'Not a driver'; END IF;

  UPDATE orders
  SET driver_id = v_uid,
      driver_accepted_at = now(),
      status = 'out_for_delivery',
      updated_at = now()
  WHERE id = p_order_id
    AND restaurant_id = v_rid
    AND order_type = 'delivery'
    AND status = 'ready'
    AND driver_id IS NULL;

  RETURN FOUND;
END; $$;

-- 7. mark delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE orders
  SET status = 'delivered',
      delivered_at = now(),
      updated_at = now()
  WHERE id = p_order_id
    AND driver_id = v_uid
    AND status = 'out_for_delivery';

  RETURN FOUND;
END; $$;

-- 8. add tip
CREATE OR REPLACE FUNCTION public.add_tip(p_order_id uuid, p_amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid tip amount';
  END IF;

  UPDATE orders
  SET tip_amount = COALESCE(tip_amount, 0) + p_amount,
      total_amount = total_amount + p_amount,
      updated_at = now()
  WHERE id = p_order_id
    AND user_id = v_uid;

  RETURN FOUND;
END; $$;

-- 9. update create_validated_order to accept tip
CREATE OR REPLACE FUNCTION public.create_validated_order(
  p_restaurant_id uuid,
  p_delivery_address text,
  p_notes text,
  p_payment_method text,
  p_items jsonb,
  p_order_type text DEFAULT 'delivery',
  p_delivery_fee numeric DEFAULT NULL,
  p_tip_amount numeric DEFAULT 0
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_menu_item RECORD;
  v_item_total DECIMAL(10,2);
  v_quantity INTEGER;
  v_delivery_fee DECIMAL(10,2) := 0;
  v_tip DECIMAL(10,2) := 0;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated to place an order'; END IF;

  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND is_active = true) THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;

  IF p_order_type NOT IN ('delivery', 'collection') THEN
    RAISE EXCEPTION 'Invalid order type';
  END IF;

  IF p_order_type = 'delivery' AND (p_delivery_address IS NULL OR length(trim(p_delivery_address)) < 5) THEN
    RAISE EXCEPTION 'Invalid delivery address';
  END IF;

  IF p_payment_method NOT IN ('cash', 'online') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT price, name, is_available INTO v_menu_item
    FROM menu_items WHERE id = (v_item->>'menu_item_id')::UUID AND restaurant_id = p_restaurant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item not found or does not belong to this restaurant'; END IF;
    IF NOT v_menu_item.is_available THEN RAISE EXCEPTION 'Menu item % is not available', v_menu_item.name; END IF;
    IF v_quantity <= 0 OR v_quantity > 100 THEN RAISE EXCEPTION 'Invalid quantity for %', v_menu_item.name; END IF;
    v_item_total := v_menu_item.price * v_quantity;
    v_total := v_total + v_item_total;
  END LOOP;

  IF p_order_type = 'delivery' THEN
    IF p_delivery_fee IS NOT NULL THEN
      IF p_delivery_fee < 0 OR p_delivery_fee > 5000 THEN RAISE EXCEPTION 'Invalid delivery fee'; END IF;
      v_delivery_fee := p_delivery_fee;
    END IF;
    v_total := v_total + v_delivery_fee;
  END IF;

  IF p_tip_amount IS NOT NULL THEN
    IF p_tip_amount < 0 OR p_tip_amount > 10000 THEN RAISE EXCEPTION 'Invalid tip amount'; END IF;
    v_tip := p_tip_amount;
    v_total := v_total + v_tip;
  END IF;

  INSERT INTO orders (
    user_id, restaurant_id, total_amount, delivery_address,
    notes, status, payment_method, order_type, tip_amount
  ) VALUES (
    v_user_id, p_restaurant_id, v_total,
    CASE WHEN p_order_type = 'delivery' THEN trim(p_delivery_address) ELSE 'Collection at store' END,
    CASE WHEN p_notes IS NOT NULL THEN trim(p_notes) ELSE NULL END,
    'pending', p_payment_method, p_order_type, v_tip
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT price, name INTO v_menu_item FROM menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
    INSERT INTO order_items (order_id, menu_item_id, quantity, price, item_name)
    VALUES (v_order_id, (v_item->>'menu_item_id')::UUID, (v_item->>'quantity')::INTEGER, v_menu_item.price, v_menu_item.name);
  END LOOP;

  RETURN v_order_id;
END; $$;
