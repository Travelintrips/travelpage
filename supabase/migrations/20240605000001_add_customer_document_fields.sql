-- Add new fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ktp_paspor_url TEXT;

-- Create storage bucket for customer documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('customers', 'customers', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow public access to customer documents
DROP POLICY IF EXISTS "Customer Documents are publicly accessible" ON storage.objects;
CREATE POLICY "Customer Documents are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customers');

-- Set up storage policy to allow authenticated users to upload customer documents
DROP POLICY IF EXISTS "Authenticated users can upload customer documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload customer documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customers');
