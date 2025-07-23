-- Fix RLS policy for selfies bucket to allow authenticated users to upload files

-- Create policy to allow authenticated users to upload to selfies bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload selfies" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload selfies"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'selfies');

-- Create policy to allow authenticated users to select from selfies bucket
DROP POLICY IF EXISTS "Allow authenticated users to view selfies" ON storage.objects;
CREATE POLICY "Allow authenticated users to view selfies"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'selfies');

-- Create policy to allow authenticated users to update their own selfies
DROP POLICY IF EXISTS "Allow users to update their own selfies" ON storage.objects;
CREATE POLICY "Allow users to update their own selfies"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'selfies' AND (auth.uid() = owner OR owner IS NULL));

-- Create policy to allow authenticated users to delete their own selfies
DROP POLICY IF EXISTS "Allow users to delete their own selfies" ON storage.objects;
CREATE POLICY "Allow users to delete their own selfies"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'selfies' AND (auth.uid() = owner OR owner IS NULL));
