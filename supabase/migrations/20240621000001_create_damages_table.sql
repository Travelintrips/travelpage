-- Create damages table to store damage information and associated fines
CREATE TABLE IF NOT EXISTS damages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups by booking_id
CREATE INDEX IF NOT EXISTS damages_booking_id_idx ON damages(booking_id);

-- Enable row level security
ALTER TABLE damages ENABLE ROW LEVEL SECURITY;

-- Create policies for damages table
DROP POLICY IF EXISTS "Authenticated users can view their own damages" ON damages;
CREATE POLICY "Authenticated users can view their own damages"
ON damages FOR SELECT
USING (
  auth.uid() IN (
    SELECT customer_id FROM bookings WHERE id = booking_id
  ) OR 
  auth.uid() IN (
    SELECT user_id FROM staff
  ) OR
  auth.uid() IN (
    SELECT user_id FROM admins
  )
);

DROP POLICY IF EXISTS "Staff and admins can insert damages" ON damages;
CREATE POLICY "Staff and admins can insert damages"
ON damages FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM staff
  ) OR
  auth.uid() IN (
    SELECT user_id FROM admins
  )
);

DROP POLICY IF EXISTS "Staff and admins can update damages" ON damages;
CREATE POLICY "Staff and admins can update damages"
ON damages FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM staff
  ) OR
  auth.uid() IN (
    SELECT user_id FROM admins
  )
);

DROP POLICY IF EXISTS "Admins can delete damages" ON damages;
CREATE POLICY "Admins can delete damages"
ON damages FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM admins
  )
);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE damages;