-- Create payment-proofs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment proofs
DROP POLICY IF EXISTS "Allow authenticated users to upload payment proofs" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow public read access to payment proofs
DROP POLICY IF EXISTS "Allow public read access to payment proofs" ON storage.objects;
CREATE POLICY "Allow public read access to payment proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to update their payment proofs
DROP POLICY IF EXISTS "Allow authenticated users to update payment proofs" ON storage.objects;
CREATE POLICY "Allow authenticated users to update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to delete payment proofs
DROP POLICY IF EXISTS "Allow authenticated users to delete payment proofs" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');
