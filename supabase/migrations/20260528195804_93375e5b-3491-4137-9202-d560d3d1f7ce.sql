ALTER TABLE public.restaurants ALTER COLUMN delivery_rate_per_100m SET DEFAULT 1.50;
UPDATE public.restaurants SET delivery_rate_per_100m = 1.50;