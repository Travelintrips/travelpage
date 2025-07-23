-- Add new fields to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS car_image_url TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS stnk_image_url TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS stnk_expiry DATE;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS pajak_expiry DATE;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Create storage bucket for car documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cars', 'cars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow public access to car documents
CREATE POLICY "Car Documents are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cars');

-- Set up storage policy to allow authenticated users to upload car documents
CREATE POLICY "Authenticated users can upload car documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cars');
