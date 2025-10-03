INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-requests', 'purchase-requests', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to purchase-requests" ON storage.objects;
CREATE POLICY "Public access to purchase-requests"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase-requests');

DROP POLICY IF EXISTS "Authenticated users can upload to purchase-requests" ON storage.objects;
CREATE POLICY "Authenticated users can upload to purchase-requests"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'purchase-requests' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their own purchase-requests" ON storage.objects;
CREATE POLICY "Users can update their own purchase-requests"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'purchase-requests' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can delete their own purchase-requests" ON storage.objects;
CREATE POLICY "Users can delete their own purchase-requests"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'purchase-requests' 
  AND auth.role() = 'authenticated'
);
