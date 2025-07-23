-- Fix payment_bookings table constraint to include handling
-- Drop and recreate the constraint to ensure it includes all booking types

ALTER TABLE payment_bookings DROP CONSTRAINT IF EXISTS payment_bookings_booking_type_check;

ALTER TABLE payment_bookings ADD CONSTRAINT payment_bookings_booking_type_check 
CHECK (booking_type IN ('baggage', 'airport_transfer', 'driver', 'car', 'handling'));

-- Ensure realtime is enabled (only add if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'payment_bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payment_bookings;
    END IF;
END $$;
