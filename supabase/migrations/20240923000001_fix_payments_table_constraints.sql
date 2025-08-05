-- Modify payments table to allow non-UUID user_id for guest users
ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;

-- Drop existing RLS policies that might be causing UUID type conflicts
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;

-- Create new RLS policies that work with TEXT user_id
CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
USING (user_id IS NULL OR user_id = auth.uid()::text OR user_id LIKE 'guest-%');

CREATE POLICY "Users can insert their own payments"
ON payments FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid()::text OR user_id LIKE 'guest-%');

CREATE POLICY "Users can update their own payments"
ON payments FOR UPDATE
USING (user_id IS NULL OR user_id = auth.uid()::text OR user_id LIKE 'guest-%');

-- Add table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
