-- Fix the roles table structure to ensure proper columns and types

-- First, check if role_id is a primary key, if not make it one
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'roles'::regclass AND contype = 'p'
  ) THEN
    -- If there's no primary key, add role_id as primary key
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_id') THEN
      ALTER TABLE roles ADD PRIMARY KEY (role_id);
    END IF;
  END IF;
END $$;

-- Make sure the role_name column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_name') THEN
    ALTER TABLE roles ADD COLUMN role_name VARCHAR(255) NOT NULL DEFAULT 'Customer';
  END IF;
END $$;

-- Add unique constraint on role_name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_role_name_key' AND conrelid = 'roles'::regclass) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);
  END IF;
END $$;

-- Make sure the Staff role exists
INSERT INTO roles (role_id, role_name) 
VALUES (2, 'Staff')
ON CONFLICT (role_name) DO NOTHING;

-- Make sure the Staff Trips role exists
INSERT INTO roles (role_id, role_name) 
VALUES (6, 'Staff Trips')
ON CONFLICT (role_name) DO NOTHING;

-- Enable realtime for the roles table
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
