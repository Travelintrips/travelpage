-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add pg_trgm indexes for better search performance
-- Only add indexes for columns that actually exist

-- Index for code_booking column on bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_code_booking_trgm ON bookings USING gin (code_booking gin_trgm_ops);

-- Index for code_booking on baggage_bookings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'baggage_bookings' AND column_name = 'code_booking') THEN
        CREATE INDEX IF NOT EXISTS idx_baggage_bookings_code_booking_trgm ON baggage_bookings USING gin (code_booking gin_trgm_ops);
    END IF;
END $$;

-- Index for code_booking on handling_bookings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'handling_bookings' AND column_name = 'code_booking') THEN
        CREATE INDEX IF NOT EXISTS idx_handling_bookings_code_booking_trgm ON handling_bookings USING gin (code_booking gin_trgm_ops);
    END IF;
END $$;

-- Index for code_booking on airport_transfer_bookings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airport_transfer_bookings' AND column_name = 'code_booking') THEN
        CREATE INDEX IF NOT EXISTS idx_airport_transfer_code_booking_trgm ON airport_transfer_bookings USING gin (code_booking gin_trgm_ops);
    END IF;
END $$;