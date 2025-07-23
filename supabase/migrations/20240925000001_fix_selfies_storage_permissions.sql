-- Drop existing policies for selfies bucket
DROP POLICY IF EXISTS "Allow public read access to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to selfies" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to selfies" ON storage.objects;

-- Create new policies with proper syntax and permissions
CREATE POLICY "Allow public read access to selfies" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'selfies');

CREATE POLICY "Allow authenticated uploads to selfies" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Allow authenticated updates to selfies" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'selfies');

CREATE POLICY "Allow authenticated deletes to selfies" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'selfies');

-- Make sure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;