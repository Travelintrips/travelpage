-- Create the selfies bucket if it doesn't exist and set proper RLS policies

-- First, ensure the storage.buckets table has the proper RLS policies
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to create buckets
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow service role to create buckets
DROP POLICY IF EXISTS "Allow service role full access" ON storage.buckets;
CREATE POLICY "Allow service role full access"
ON storage.buckets
FOR ALL
TO service_role
USING (true);

-- Create policy for objects as well
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to insert objects into buckets
DROP POLICY IF EXISTS "Allow authenticated users to upload objects" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own objects
DROP POLICY IF EXISTS "Allow users to update their own objects" ON storage.objects;
CREATE POLICY "Allow users to update their own objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

-- Allow users to select objects
DROP POLICY IF EXISTS "Allow users to select objects" ON storage.objects;
CREATE POLICY "Allow users to select objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access to objects
DROP POLICY IF EXISTS "Allow service role full access to objects" ON storage.objects;
CREATE POLICY "Allow service role full access to objects"
ON storage.objects
FOR ALL
TO service_role
USING (true);
