-- This migration fixes the relationship between payments and damages
-- It keeps the is_damage_payment column but removes the direct damage_id reference

-- First, check if the damage_id column exists before trying to drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'payments' 
               AND column_name = 'damage_id') THEN
        ALTER TABLE payments DROP COLUMN IF EXISTS damage_id;
    END IF;
END $$;

-- Make sure the is_damage_payment column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'payments' 
                  AND column_name = 'is_damage_payment') THEN
        ALTER TABLE payments ADD COLUMN is_damage_payment BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update the damages table to include payment_id as a nullable reference
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'damages' 
                  AND column_name = 'payment_id') THEN
        ALTER TABLE damages ADD COLUMN payment_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'damages' 
                  AND column_name = 'payment_status') THEN
        ALTER TABLE damages ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
    END IF;
END $$;
