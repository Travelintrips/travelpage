-- Fix the roles table structure
ALTER TABLE roles ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;

-- Make sure the role_name column exists
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_name VARCHAR(255) NOT NULL DEFAULT 'Customer';

-- Add the Staff Trips role if it doesn't exist
INSERT INTO roles (role_name) 
VALUES ('Staff Trips')
ON CONFLICT (role_name) DO NOTHING;
