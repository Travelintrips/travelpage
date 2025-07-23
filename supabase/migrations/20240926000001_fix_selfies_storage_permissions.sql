-- Completely disable RLS for storage.objects table
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Drop existing policies for selfies bucket
DROP POLICY IF EXISTS "Allow public read access to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on selfies bucket" ON storage.objects;

-- Make sure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;
