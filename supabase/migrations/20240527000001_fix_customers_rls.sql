-- Fix RLS policies for customers table

-- First, temporarily disable RLS to allow inserts during registration
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts for authenticated users
DROP POLICY IF EXISTS "Users can insert their own customer data" ON customers;
CREATE POLICY "Users can insert their own customer data"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create a policy to allow admins to insert customer data
DROP POLICY IF EXISTS "Admin users can insert customer data" ON customers;
CREATE POLICY "Admin users can insert customer data"
  ON customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE role_name = 'Admin')
    )
  );

-- Re-enable RLS after creating the policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
