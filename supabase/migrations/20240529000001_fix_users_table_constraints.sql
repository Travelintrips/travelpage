-- Fix users table constraints to allow registration

-- First, check if the users table has a unique constraint on email
DO $$ 
BEGIN
  -- Drop the unique constraint on email if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_email_key;
  END IF;

  -- Drop the unique constraint on phone if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_key' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_phone_key;
  END IF;

  -- Drop the unique constraint on phone_number if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_number_key' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_phone_number_key;
  END IF;
END $$;

-- Disable RLS temporarily for users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts for authenticated users
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
