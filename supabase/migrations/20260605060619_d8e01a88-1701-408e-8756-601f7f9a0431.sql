-- Helper: is the current user staff of a specific restaurant (security definer avoids recursion)
CREATE OR REPLACE FUNCTION public.is_staff_of(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurant_staff
    WHERE restaurant_id = p_restaurant_id
      AND user_id = auth.uid()
  )
$$;

-- Allow owners or staff to toggle the store open/closed for orders
CREATE OR REPLACE FUNCTION public.set_store_open(p_restaurant_id uuid, p_open boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_restaurant_owner(p_restaurant_id) OR public.is_staff_of(p_restaurant_id)) THEN
    RAISE EXCEPTION 'Not authorized to update this restaurant';
  END IF;

  UPDATE restaurants
  SET is_accepting_orders = p_open,
      updated_at = now()
  WHERE id = p_restaurant_id;

  RETURN true;
END;
$$;

-- Staff can view and remove staff members of their restaurant
CREATE POLICY "Staff can view restaurant staff"
ON public.restaurant_staff
FOR SELECT
TO authenticated
USING (public.is_staff_of(restaurant_id));

CREATE POLICY "Staff can remove restaurant staff"
ON public.restaurant_staff
FOR DELETE
TO authenticated
USING (public.is_staff_of(restaurant_id));

-- Staff can view and remove drivers of their restaurant
CREATE POLICY "Staff can view restaurant drivers"
ON public.restaurant_drivers
FOR SELECT
TO authenticated
USING (public.is_staff_of(restaurant_id));

CREATE POLICY "Staff can remove restaurant drivers"
ON public.restaurant_drivers
FOR DELETE
TO authenticated
USING (public.is_staff_of(restaurant_id));