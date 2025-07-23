-- Create vehicle-inspections bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-inspections', 'vehicle-inspections', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END
$$;

-- Create policy to allow authenticated users to upload to vehicle-inspections bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload to vehicle-inspections bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to vehicle-inspections bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'vehicle-inspections')
WITH CHECK (bucket_id = 'vehicle-inspections');
