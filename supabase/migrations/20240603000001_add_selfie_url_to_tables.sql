-- Add selfie_url column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'selfie_url') THEN
        ALTER TABLE users ADD COLUMN selfie_url TEXT;
    END IF;
END $$;

-- Add selfie_url column to customers table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'selfie_url') THEN
        ALTER TABLE customers ADD COLUMN selfie_url TEXT;
    END IF;
END $$;

-- Create selfies bucket if it doesn't exist
DO $$ 
BEGIN
    -- This is a placeholder. In a real implementation, you would need to use
    -- the Supabase Management API to create a storage bucket.
    -- For now, you'll need to create this bucket manually in the Supabase dashboard.
    -- Name it 'selfies' and set the appropriate permissions.
END $$;
