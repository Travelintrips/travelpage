-- Modify payments table to allow non-UUID user_id for guest users
ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;

-- Add table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
