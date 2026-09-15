DROP POLICY IF EXISTS "Menu image upload for owners and staff" ON storage.objects;
DROP POLICY IF EXISTS "Menu image update for owners and staff" ON storage.objects;
DROP POLICY IF EXISTS "Menu image delete for owners and staff" ON storage.objects;

CREATE POLICY "Menu image upload for owners and staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND (
    public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Menu image update for owners and staff"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (
    public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
)
WITH CHECK (
  bucket_id = 'menu-images'
  AND (
    public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Menu image delete for owners and staff"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (
    public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);