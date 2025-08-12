-- Add extra_baggage_count column to handling_bookings table
ALTER TABLE handling_bookings 
ADD COLUMN IF NOT EXISTS extra_baggage_count INTEGER;

-- Add CHECK constraint to ensure extra_baggage_count is >= 1 when not null
ALTER TABLE handling_bookings 
ADD CONSTRAINT check_extra_baggage_count_min 
CHECK (extra_baggage_count IS NULL OR extra_baggage_count >= 1);

-- Remove any existing maximum value constraints on extra_baggage_count if they exist
-- (This is a safety measure in case there were previous constraints)
DO $$
BEGIN
    -- Check if there are any constraints with 'extra_baggage' in the name that might limit maximum values
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%extra_baggage%' 
        AND constraint_name != 'check_extra_baggage_count_min'
        AND table_name = 'handling_bookings'
    ) THEN
        -- Drop any other extra_baggage constraints (this would need to be customized based on actual constraint names)
        RAISE NOTICE 'Found existing extra_baggage constraints. Please review and remove manually if they limit maximum values.';
    END IF;
END $$;

-- Update existing Porter Service records to have a default value of 1 for extra_baggage_count
UPDATE handling_bookings 
SET extra_baggage_count = 1 
WHERE category = 'Porter Service' 
AND extra_baggage_count IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN handling_bookings.extra_baggage_count IS 'Number of extra baggage items for Porter Service bookings. Must be >= 1 when specified.';
