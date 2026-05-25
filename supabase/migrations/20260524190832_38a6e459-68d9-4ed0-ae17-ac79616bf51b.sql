ALTER TABLE public.restaurants ALTER COLUMN delivery_rate_per_100m SET DEFAULT 0.50;
UPDATE public.restaurants SET delivery_rate_per_100m = 0.50 WHERE delivery_rate_per_100m = 0.70;