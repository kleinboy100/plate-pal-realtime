DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public
AS
SELECT id, restaurant_id, rating, comment, created_at
FROM public.reviews;

GRANT SELECT ON public.reviews_public TO anon;
GRANT SELECT ON public.reviews_public TO authenticated;
GRANT SELECT ON public.reviews_public TO service_role;