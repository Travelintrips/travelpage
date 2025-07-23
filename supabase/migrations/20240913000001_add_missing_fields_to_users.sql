-- Add missing fields to users table if they don't exist
DO $$ 
BEGIN
  -- Check if phone column exists, if not add it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;

  -- Make sure role_id is not null
  ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

  -- Add default values for existing records
  UPDATE users SET phone = '' WHERE phone IS NULL;

EXCEPTION
  WHEN others THEN
    NULL;
END $$;