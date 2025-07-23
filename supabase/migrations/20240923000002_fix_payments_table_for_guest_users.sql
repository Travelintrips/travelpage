-- Drop the existing policy that depends on user_id
DROP POLICY IF EXISTS "Allow users to view their own payments" ON payments;

-- Create a new policy that works with both UUID and text user_id
CREATE POLICY "Allow users to view their payments"
ON payments
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Create policy to allow public inserts for guest users
DROP POLICY IF EXISTS "Allow public inserts for payments" ON payments;
CREATE POLICY "Allow public inserts for payments"
ON payments
FOR INSERT
TO public
WITH CHECK (true);

-- Add table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
