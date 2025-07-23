-- Fix RLS policies for users table

-- First disable RLS to allow operations
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts for authenticated users
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create a policy to allow users to update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Create a policy to allow users to select their own data
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Create a policy to allow admins to manage all user data
DROP POLICY IF EXISTS "Admins can manage all user data" ON users;
CREATE POLICY "Admins can manage all user data"
  ON users
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role_id IN (SELECT id FROM roles WHERE role_name = 'Admin')
    )
  );

-- Re-enable RLS with the new policies in place
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
