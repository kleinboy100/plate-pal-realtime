CREATE POLICY "Owners and staff can view all their menu items"
ON public.menu_items
FOR SELECT
TO authenticated
USING (
  public.is_restaurant_owner(restaurant_id)
  OR public.is_staff_of(restaurant_id)
);