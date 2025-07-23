-- Add is_guest column to booking tables
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;
ALTER TABLE baggage_booking ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;
ALTER TABLE airport_transfer ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_is_guest ON bookings(is_guest);
CREATE INDEX IF NOT EXISTS idx_baggage_booking_is_guest ON baggage_booking(is_guest);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_is_guest ON airport_transfer(is_guest);

-- Enable realtime for updated tables
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE baggage_booking;
ALTER PUBLICATION supabase_realtime ADD TABLE airport_transfer;
