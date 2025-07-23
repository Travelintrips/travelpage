-- Fix RLS policy for staff table to allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "admin full access to staff" ON staff;
DROP POLICY IF EXISTS "Users can view their own staff record" ON staff;
DROP POLICY IF EXISTS "Staff can view their own record" ON staff;
DROP POLICY IF EXISTS "admin_full_access_to_staff" ON staff;

-- Create comprehensive admin policy with better admin detection
CREATE POLICY "admin_full_access_to_staff"
ON staff FOR ALL
TO authenticated
USING (
  -- Allow if user is admin (check by role)
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.id = auth.uid()
    AND r.role_name = 'Admin'
  )
  OR
  -- Allow if user email contains admin or is specific admin email
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.email ILIKE '%admin%' OR au.email = 'divatranssoetta@gmail.com')
  )
  OR
  -- Allow if user has admin role in user_metadata
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_user_meta_data->>'role' = 'Admin'
  )
  OR
  -- Allow users to view their own staff record
  id = auth.uid()
)
WITH CHECK (
  -- Allow if user is admin (check by role)
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.id = auth.uid()
    AND r.role_name = 'Admin'
  )
  OR
  -- Allow if user email contains admin or is specific admin email
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.email ILIKE '%admin%' OR au.email = 'divatranssoetta@gmail.com')
  )
  OR
  -- Allow if user has admin role in user_metadata
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_user_meta_data->>'role' = 'Admin'
  )
  OR
  -- Allow users to update their own staff record
  id = auth.uid()
);

-- Ensure RLS is enabled
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Add staff table to realtime (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'staff'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE staff;
    END IF;
END $$;