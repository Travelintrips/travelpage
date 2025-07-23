-- Create storage bucket for driver documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('drivers', 'drivers', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow public access to driver documents
DROP POLICY IF EXISTS "Driver Documents are publicly accessible" ON storage.objects;
CREATE POLICY "Driver Documents are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'drivers');

-- Set up storage policy to allow authenticated users to upload driver documents
DROP POLICY IF EXISTS "Authenticated users can upload driver documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload driver documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drivers');
