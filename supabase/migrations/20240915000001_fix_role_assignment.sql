-- Fix role assignment issues

-- Make sure the Staff Trips role exists
INSERT INTO roles (role_id, role_name)
VALUES (11, 'Staff Trips')
ON CONFLICT (role_id) DO NOTHING;

-- Fix role_id column in users table to ensure it accepts the correct type
ALTER TABLE users
ALTER COLUMN role_id TYPE integer USING role_id::integer;

-- Add missing columns that might be used in role assignment
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS role_name text;

-- Enable realtime for roles table
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
