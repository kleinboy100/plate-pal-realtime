CREATE POLICY "Drivers can view messages for their orders"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = messages.order_id
      AND orders.driver_id = auth.uid()
  )
);

CREATE POLICY "Drivers can send messages for their orders"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'restaurant'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = messages.order_id
      AND orders.driver_id = auth.uid()
  )
);