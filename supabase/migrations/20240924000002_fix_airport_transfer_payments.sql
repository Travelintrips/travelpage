-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts for airport transfer payments" ON airport_transfer_payments;
DROP POLICY IF EXISTS "Allow users to view their airport transfer payments" ON airport_transfer_payments;

-- Create policies again
CREATE POLICY "Allow public inserts for airport transfer payments"
ON airport_transfer_payments
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow users to view their airport transfer payments"
ON airport_transfer_payments
FOR SELECT
TO public
USING (true);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE airport_transfer_payments;
