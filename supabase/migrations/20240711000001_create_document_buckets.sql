-- Create buckets for document storage if they don't exist already
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver_documents', 'Driver Documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('staff_documents', 'Staff Documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the buckets
CREATE POLICY "Public read access for driver_documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver_documents');

CREATE POLICY "Auth users can upload driver_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver_documents');

CREATE POLICY "Users can update their own driver_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read access for staff_documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'staff_documents');

CREATE POLICY "Auth users can upload staff_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'staff_documents');

CREATE POLICY "Users can update their own staff_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'staff_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add document URL fields to the drivers table if they don't exist
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS ktp_url TEXT,
ADD COLUMN IF NOT EXISTS sim_url TEXT;

-- Add document URL field to the staff table if it doesn't exist
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS id_card_url TEXT;

-- Add tables to realtime publication
alter publication supabase_realtime add table drivers;
alter publication supabase_realtime add table staff;