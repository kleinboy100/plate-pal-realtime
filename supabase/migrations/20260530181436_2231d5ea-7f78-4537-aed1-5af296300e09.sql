ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.create_validated_order(p_restaurant_id uuid, p_delivery_address text, p_notes text, p_payment_method text, p_items jsonb, p_order_type text DEFAULT 'delivery'::text, p_delivery_fee numeric DEFAULT NULL::numeric, p_tip_amount numeric DEFAULT 0, p_delivery_latitude numeric DEFAULT NULL::numeric, p_delivery_longitude numeric DEFAULT NULL::numeric, p_delivery_location_accuracy_m numeric DEFAULT NULL::numeric, p_delivery_place_id text DEFAULT NULL::text, p_delivery_address_source text DEFAULT 'manual'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_total decimal(10,2) := 0;
  v_item jsonb;
  v_menu_item record;
  v_item_total decimal(10,2);
  v_quantity integer;
  v_delivery_fee decimal(10,2) := 0;
  v_tip decimal(10,2) := 0;
  v_user_id uuid;
  v_source text := COALESCE(p_delivery_address_source, 'manual');
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to place an order';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id AND is_active = true) THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;

  IF p_order_type NOT IN ('delivery', 'collection') THEN
    RAISE EXCEPTION 'Invalid order type';
  END IF;

  IF p_order_type = 'delivery' AND (p_delivery_address IS NULL OR length(trim(p_delivery_address)) < 5) THEN
    RAISE EXCEPTION 'Invalid delivery address';
  END IF;

  IF p_delivery_address IS NOT NULL AND length(p_delivery_address) > 500 THEN
    RAISE EXCEPTION 'Delivery address is too long';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'Order notes are too long';
  END IF;

  IF p_payment_method NOT IN ('cash', 'online') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF p_order_type = 'delivery' THEN
    IF (p_delivery_latitude IS NULL) <> (p_delivery_longitude IS NULL) THEN
      RAISE EXCEPTION 'Both delivery latitude and longitude are required';
    END IF;
    IF p_delivery_latitude IS NOT NULL AND (p_delivery_latitude < -90 OR p_delivery_latitude > 90) THEN
      RAISE EXCEPTION 'Invalid delivery latitude';
    END IF;
    IF p_delivery_longitude IS NOT NULL AND (p_delivery_longitude < -180 OR p_delivery_longitude > 180) THEN
      RAISE EXCEPTION 'Invalid delivery longitude';
    END IF;
    IF p_delivery_location_accuracy_m IS NOT NULL AND (p_delivery_location_accuracy_m < 0 OR p_delivery_location_accuracy_m > 50000) THEN
      RAISE EXCEPTION 'Invalid location accuracy';
    END IF;
    IF v_source NOT IN ('search', 'current_location', 'pin', 'manual') THEN
      RAISE EXCEPTION 'Invalid address source';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_quantity := (v_item->>'quantity')::integer;
    SELECT price, name, is_available INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item not found or does not belong to this restaurant';
    END IF;
    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'Menu item % is not available', v_menu_item.name;
    END IF;
    IF v_quantity <= 0 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for %', v_menu_item.name;
    END IF;

    v_item_total := v_menu_item.price * v_quantity;
    v_total := v_total + v_item_total;
  END LOOP;

  IF p_order_type = 'delivery' THEN
    IF p_delivery_fee IS NOT NULL THEN
      IF p_delivery_fee < 0 OR p_delivery_fee > 5000 THEN
        RAISE EXCEPTION 'Invalid delivery fee';
      END IF;
      v_delivery_fee := p_delivery_fee;
    END IF;
    v_total := v_total + v_delivery_fee;
  END IF;

  IF p_tip_amount IS NOT NULL THEN
    IF p_tip_amount < 0 OR p_tip_amount > 10000 THEN
      RAISE EXCEPTION 'Invalid tip amount';
    END IF;
    v_tip := p_tip_amount;
    v_total := v_total + v_tip;
  END IF;

  INSERT INTO public.orders (
    user_id,
    restaurant_id,
    total_amount,
    delivery_fee,
    delivery_address,
    notes,
    status,
    payment_method,
    order_type,
    tip_amount,
    delivery_latitude,
    delivery_longitude,
    delivery_location_accuracy_m,
    delivery_place_id,
    delivery_address_source
  ) VALUES (
    v_user_id,
    p_restaurant_id,
    v_total,
    CASE WHEN p_order_type = 'delivery' THEN v_delivery_fee ELSE 0 END,
    CASE WHEN p_order_type = 'delivery' THEN trim(p_delivery_address) ELSE 'Collection at store' END,
    CASE WHEN p_notes IS NOT NULL THEN trim(p_notes) ELSE NULL END,
    'pending',
    p_payment_method,
    p_order_type,
    v_tip,
    CASE WHEN p_order_type = 'delivery' THEN p_delivery_latitude ELSE NULL END,
    CASE WHEN p_order_type = 'delivery' THEN p_delivery_longitude ELSE NULL END,
    CASE WHEN p_order_type = 'delivery' THEN p_delivery_location_accuracy_m ELSE NULL END,
    CASE WHEN p_order_type = 'delivery' THEN NULLIF(trim(COALESCE(p_delivery_place_id, '')), '') ELSE NULL END,
    CASE WHEN p_order_type = 'delivery' THEN v_source ELSE NULL END
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT price, name INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid;

    INSERT INTO public.order_items (order_id, menu_item_id, quantity, price, item_name)
    VALUES (v_order_id, (v_item->>'menu_item_id')::uuid, (v_item->>'quantity')::integer, v_menu_item.price, v_menu_item.name);
  END LOOP;

  RETURN v_order_id;
END;
$function$;