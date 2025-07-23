-- Fix permissions for selfies bucket
DROP POLICY IF EXISTS "Allow public read access to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to selfies" ON storage.objects;

CREATE POLICY "Allow public read access to selfies" ON storage.objects FOR SELECT USING (bucket_id = 'selfies');
CREATE POLICY "Allow authenticated uploads to selfies" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'selfies' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated updates to selfies" ON storage.objects FOR UPDATE USING (bucket_id = 'selfies' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes to selfies" ON storage.objects FOR DELETE USING (bucket_id = 'selfies' AND auth.role() = 'authenticated');