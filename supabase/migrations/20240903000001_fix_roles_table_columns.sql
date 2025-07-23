-- Fix the roles table structure by ensuring the correct columns exist

-- First, check if the name column exists and rename it to role_name if it does
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'name') THEN
    ALTER TABLE roles RENAME COLUMN name TO role_name;
  END IF;
END $$;

-- Add id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id') THEN
    ALTER TABLE roles ADD COLUMN id SERIAL PRIMARY KEY;
  END IF;
END $$;

-- Make sure the role_name column exists and has the right constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_name') THEN
    ALTER TABLE roles ADD COLUMN role_name VARCHAR(255) NOT NULL DEFAULT 'Customer';
  END IF;
END $$;

-- Add unique constraint on role_name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_role_name_key') THEN
    ALTER TABLE roles ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);
  END IF;
END $$;

-- Add the Staff Trips role if it doesn't exist
INSERT INTO roles (role_name) 
VALUES ('Staff Trips')
ON CONFLICT (role_name) DO NOTHING;
