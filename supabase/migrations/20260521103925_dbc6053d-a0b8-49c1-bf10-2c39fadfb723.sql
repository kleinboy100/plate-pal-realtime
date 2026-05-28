
REVOKE EXECUTE ON FUNCTION public.claim_delivery_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_order_delivered(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_tip(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_driver() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.driver_restaurant_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_delivery_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_tip(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_driver() TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_restaurant_id(uuid) TO authenticated;
