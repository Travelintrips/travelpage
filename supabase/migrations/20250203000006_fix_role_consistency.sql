-- Fix role consistency between role and role_id columns

-- First, let's check and fix the roles table to ensure it has the correct mappings
-- Use ON CONFLICT DO NOTHING to avoid duplicate key errors
INSERT INTO roles (role_id, role_name) VALUES 
  (1, 'Customer'),
  (2, 'Driver Mitra'),
  (3, 'Driver Perusahaan'),
  (4, 'Agent'),
  (5, 'Staff'),
  (6, 'Staff Admin'),
  (7, 'Staff Trips'),
  (8, 'Staff Traffic'),
  (99, 'Super Admin')
ON CONFLICT (role_id) DO NOTHING;

-- Update users table to ensure role column matches role_id
UPDATE users 
SET role = r.role_name
FROM roles r 
WHERE users.role_id = r.role_id 
AND (users.role IS NULL OR users.role != r.role_name);

-- For users where role_id is NULL but role exists, try to set role_id based on role
UPDATE users 
SET role_id = r.role_id
FROM roles r 
WHERE users.role = r.role_name 
AND users.role_id IS NULL;

-- Create a function to keep role and role_id in sync
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role_id is updated, update role to match
  IF NEW.role_id IS DISTINCT FROM OLD.role_id AND NEW.role_id IS NOT NULL THEN
    SELECT role_name INTO NEW.role FROM roles WHERE role_id = NEW.role_id;
  END IF;
  
  -- If role is updated, update role_id to match
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role IS NOT NULL THEN
    SELECT role_id INTO NEW.role_id FROM roles WHERE role_name = NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep role and role_id in sync
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Add logging function to track role changes
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes for debugging
  RAISE NOTICE 'Role change for user %: role_id % -> %, role % -> %', 
    COALESCE(NEW.id, OLD.id),
    OLD.role_id, NEW.role_id,
    OLD.role, NEW.role;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging role changes
DROP TRIGGER IF EXISTS log_role_changes_trigger ON users;
CREATE TRIGGER log_role_changes_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.role_id IS DISTINCT FROM NEW.role_id)
  EXECUTE FUNCTION log_role_changes();

-- Fix specific user mentioned in the issue (Robby Dua)
-- First check if the user exists and log current state
DO $$
BEGIN
  -- Log current state for debugging
  RAISE NOTICE 'Current state for user 9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26:';
  RAISE NOTICE 'Users table: role=%, role_id=%', 
    (SELECT role FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'),
    (SELECT role_id FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
  RAISE NOTICE 'Staff table: role=%', 
    (SELECT role FROM staff WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
END $$;

-- Update users table
UPDATE users 
SET role = 'Staff Admin', role_id = 6
WHERE email = 'robbyadmin1@gmail.com' 
AND id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26';

-- Also update staff table if exists
UPDATE staff 
SET role = 'Staff Admin'
WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'
AND role != 'Staff Admin';

-- Log final state
DO $$
BEGIN
  RAISE NOTICE 'Final state for user 9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26:';
  RAISE NOTICE 'Users table: role=%, role_id=%', 
    (SELECT role FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'),
    (SELECT role_id FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
  RAISE NOTICE 'Staff table: role=%', 
    (SELECT role FROM staff WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
END $$;

-- Create a view to easily check role consistency
CREATE OR REPLACE VIEW v_user_role_consistency AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role as user_role,
  u.role_id as user_role_id,
  r.role_name as expected_role_from_id,
  s.role as staff_role,
  CASE 
    WHEN u.role != r.role_name THEN 'MISMATCH: role column does not match role_id'
    WHEN u.role IS NULL AND u.role_id IS NOT NULL THEN 'MISSING: role column is null but role_id exists'
    WHEN u.role IS NOT NULL AND u.role_id IS NULL THEN 'MISSING: role_id is null but role column exists'
    WHEN s.role IS NOT NULL AND s.role != u.role THEN 'MISMATCH: staff role differs from user role'
    ELSE 'OK'
  END as consistency_status
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
LEFT JOIN staff s ON u.id = s.id
WHERE u.role IS NOT NULL OR u.role_id IS NOT NULL OR s.role IS NOT NULL
ORDER BY 
  CASE 
    WHEN u.role != r.role_name THEN 1
    WHEN u.role IS NULL AND u.role_id IS NOT NULL THEN 2
    WHEN u.role IS NOT NULL AND u.role_id IS NULL THEN 3
    WHEN s.role IS NOT NULL AND s.role != u.role THEN 4
    ELSE 5
  END,
  u.email;