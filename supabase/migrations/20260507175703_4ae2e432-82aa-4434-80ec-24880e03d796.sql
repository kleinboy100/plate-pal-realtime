
-- Conversation logs table
CREATE TABLE public.conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_id uuid,
  order_number integer,
  email text,
  conversation_date date NOT NULL DEFAULT CURRENT_DATE,
  conversation_time time NOT NULL DEFAULT CURRENT_TIME,
  messages text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage conversation logs"
  ON public.conversation_logs FOR ALL TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Staff manage conversation logs"
  ON public.conversation_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurant_staff WHERE restaurant_id = conversation_logs.restaurant_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurant_staff WHERE restaurant_id = conversation_logs.restaurant_id AND user_id = auth.uid()));

CREATE TRIGGER update_conversation_logs_updated_at
  BEFORE UPDATE ON public.conversation_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-message on delivery order confirmation
CREATE OR REPLACE FUNCTION public.send_delivery_phone_request_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF NEW.status = 'confirmed'
     AND (OLD.status IS NULL OR OLD.status <> 'confirmed')
     AND NEW.order_type = 'delivery' THEN

    SELECT owner_id INTO v_owner_id FROM restaurants WHERE id = NEW.restaurant_id;

    INSERT INTO messages (order_id, sender_id, sender_type, content)
    VALUES (
      NEW.id,
      COALESCE(v_owner_id, NEW.restaurant_id),
      'restaurant',
      'Thank you for your order, kindly leave your phone numbers here for the delivery guy to contact you on his way'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_delivery_phone_request ON public.orders;
CREATE TRIGGER trg_send_delivery_phone_request
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.send_delivery_phone_request_message();
