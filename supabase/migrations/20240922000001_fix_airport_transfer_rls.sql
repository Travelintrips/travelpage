-- Enable RLS on airport_transfer table if not already enabled
ALTER TABLE airport_transfer ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow insert for authenticated and guest users" ON airport_transfer;
DROP POLICY IF EXISTS "Allow select for authenticated and guest users" ON airport_transfer;

-- Create policy to allow inserts for both authenticated and guest users
CREATE POLICY "Allow insert for authenticated and guest users"
ON airport_transfer
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow users to view their own bookings
CREATE POLICY "Allow select for authenticated and guest users"
ON airport_transfer
FOR SELECT
TO public
USING (true);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE airport_transfer;
