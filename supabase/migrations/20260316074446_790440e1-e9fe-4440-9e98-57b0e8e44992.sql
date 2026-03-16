-- Drop broken policies
DROP POLICY IF EXISTS "Restaurant owners can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete menu images" ON storage.objects;

-- Recreate with correct reference to storage object name (not restaurants.name)
CREATE POLICY "Restaurant owners can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id::text = (storage.foldername(name))[1]
      AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id::text = (storage.foldername(name))[1]
      AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id::text = (storage.foldername(name))[1]
      AND restaurants.owner_id = auth.uid()
  )
);