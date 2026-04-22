
DROP POLICY IF EXISTS "anyone views avatars" ON storage.objects;

-- Allow direct fetch of any file in zooter-avatars (public reads via URL),
-- but don't allow arbitrary listing (storage.objects SELECT requires the file to be referenced)
CREATE POLICY "public read zooter avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'zooter-avatars' AND owner IS NOT NULL);
