-- Force update Robby Dua's role to Staff Admin in all relevant tables

-- Log current state before update
DO $$
BEGIN
  RAISE NOTICE 'BEFORE UPDATE - Current state for user 9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26:';
  RAISE NOTICE 'Users table: role=%, role_id=%', 
    (SELECT role FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'),
    (SELECT role_id FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
  RAISE NOTICE 'Staff table: role=%', 
    (SELECT role FROM staff WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
END $$;

-- Force update users table with Staff Admin role
UPDATE users 
SET role = 'Staff Admin', role_id = 6
WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'
AND email = 'robbyadmin1@gmail.com';

-- Force update staff table with Staff Admin role
UPDATE staff 
SET role = 'Staff Admin'
WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26';

-- If no staff record exists, create one
INSERT INTO staff (id, role, full_name, email, phone)
SELECT 
  '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26',
  'Staff Admin',
  u.full_name,
  u.email,
  u.phone
FROM users u
WHERE u.id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'
AND NOT EXISTS (
  SELECT 1 FROM staff s WHERE s.id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'
);

-- Log final state after update
DO $$
BEGIN
  RAISE NOTICE 'AFTER UPDATE - Final state for user 9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26:';
  RAISE NOTICE 'Users table: role=%, role_id=%', 
    (SELECT role FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26'),
    (SELECT role_id FROM users WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
  RAISE NOTICE 'Staff table: role=%', 
    (SELECT role FROM staff WHERE id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26');
  RAISE NOTICE 'Update completed successfully';
END $$;

-- Verify the role consistency view shows OK for this user
DO $$
DECLARE
  consistency_status TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN u.role != r.role_name THEN 'MISMATCH: role column does not match role_id'
      WHEN u.role IS NULL AND u.role_id IS NOT NULL THEN 'MISSING: role column is null but role_id exists'
      WHEN u.role IS NOT NULL AND u.role_id IS NULL THEN 'MISSING: role_id is null but role column exists'
      WHEN s.role IS NOT NULL AND s.role != u.role THEN 'MISMATCH: staff role differs from user role'
      ELSE 'OK'
    END
  INTO consistency_status
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.role_id
  LEFT JOIN staff s ON u.id = s.id
  WHERE u.id = '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26';
  
  RAISE NOTICE 'Role consistency status for Robby Dua: %', consistency_status;
END $$;