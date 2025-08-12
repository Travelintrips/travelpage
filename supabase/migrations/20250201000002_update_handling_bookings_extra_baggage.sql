-- Update handling_bookings table to add extra_baggage_count column with proper validation
-- and ensure total_amount column exists

-- Add extra_baggage_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'handling_bookings' 
                   AND column_name = 'extra_baggage_count') THEN
        ALTER TABLE handling_bookings 
        ADD COLUMN extra_baggage_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add total_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'handling_bookings' 
                   AND column_name = 'total_amount') THEN
        ALTER TABLE handling_bookings 
        ADD COLUMN total_amount DECIMAL(12,2);
    END IF;
END $$;

-- Add check constraint for extra_baggage_count >= 0
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'check_extra_baggage_count_non_negative') THEN
        ALTER TABLE handling_bookings 
        ADD CONSTRAINT check_extra_baggage_count_non_negative 
        CHECK (extra_baggage_count >= 0);
    END IF;
END $$;

-- Update existing Porter Service records to have proper pricing
-- Base price: Rp 70,000, Additional baggage: Rp 10,000 per bag
UPDATE handling_bookings 
SET 
    total_amount = 70000 + (COALESCE(extra_baggage_count, 0) * 10000),
    total_price = 70000 + (COALESCE(extra_baggage_count, 0) * 10000),
    service_price = 70000,
    category_price = COALESCE(extra_baggage_count, 0) * 10000
WHERE category = 'Porter Service';

-- Add comment to the column
COMMENT ON COLUMN handling_bookings.extra_baggage_count IS 'Number of extra baggage items for Porter Service (minimum 0)';
COMMENT ON COLUMN handling_bookings.total_amount IS 'Total amount to be paid for the handling service';
