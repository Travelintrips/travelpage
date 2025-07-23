-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on selfies bucket" ON storage.objects;

-- Create a policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations on selfies bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'selfies')
WITH CHECK (bucket_id = 'selfies');

-- Make sure the bucket is public
UPDATE storage.buckets
SET public = true
WHERE name = 'selfies';

-- Disable RLS temporarily to debug
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;