ALTER TABLE public.orders
  ADD COLUMN preparation_started_at timestamp with time zone,
  ADD COLUMN ready_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.record_order_preparation_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'preparing'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'preparing')
     AND NEW.preparation_started_at IS NULL THEN
    NEW.preparation_started_at := now();
  END IF;

  IF NEW.status = 'ready'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ready')
     AND NEW.ready_at IS NULL THEN
    NEW.ready_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER record_order_preparation_times_trigger
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_order_preparation_times();