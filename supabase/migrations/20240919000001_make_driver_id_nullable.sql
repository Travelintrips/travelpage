-- Make driver_id nullable in bookings table
ALTER TABLE bookings ALTER COLUMN driver_id DROP NOT NULL;

-- Add this table to realtime publication
alter publication supabase_realtime add table bookings;