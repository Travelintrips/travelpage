-- Add new fields to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS sim_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stnk_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS kk_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stnk_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reference_phone TEXT;

-- Create storage bucket for driver documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow public access to driver documents
CREATE POLICY "Driver Documents are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents');

-- Set up storage policy to allow authenticated users to upload driver documents
CREATE POLICY "Authenticated users can upload driver documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'driver-documents');
