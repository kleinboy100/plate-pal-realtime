DROP POLICY IF EXISTS "Restaurant owners can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete menu images" ON storage.objects;

CREATE POLICY "Menu image upload for owners and staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images' AND (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Menu image update for owners and staff"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'menu-images' AND (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Menu image delete for owners and staff"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'menu-images' AND (
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    OR public.is_staff_of(((storage.foldername(name))[1])::uuid)
  )
);