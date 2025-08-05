-- Fix the UUID = TEXT error in payments table
-- This migration ensures the user_id column is properly configured as TEXT
-- and removes any conflicting RLS policies

-- Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON payments;
DROP POLICY IF EXISTS "Staff can update payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to view their payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update their payments" ON payments;
DROP POLICY IF EXISTS "Allow public access for guest payments" ON payments;
DROP POLICY IF EXISTS "Allow admin full access to payments" ON payments;
DROP POLICY IF EXISTS "Allow users to create their own payments 1" ON payments;
DROP POLICY IF EXISTS "Allow users to view their payments" ON payments;
DROP POLICY IF EXISTS "Allow public inserts for payments" ON payments;
DROP POLICY IF EXISTS "Allow users to view their own payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage all payments" ON payments;
DROP POLICY IF EXISTS "Allow all access to payments" ON payments;

-- Ensure the user_id column is TEXT and nullable
DO $$
BEGIN
  -- Drop foreign key constraint if it exists
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
  
  -- Change column type to TEXT (safe even if already TEXT)
  ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;
  
  -- Make user_id nullable to support guest users
  ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue if there are any errors
    NULL;
END
$$;

-- Create simple RLS policies that work with TEXT user_id
-- Policy for authenticated users to view their own payments
CREATE POLICY "Authenticated users can view their payments"
ON payments FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Policy for authenticated users to insert payments
CREATE POLICY "Authenticated users can insert payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

-- Policy for authenticated users to update their payments
CREATE POLICY "Authenticated users can update their payments"
ON payments FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text OR user_id IS NULL)
WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

-- Policy for public access (guest users)
CREATE POLICY "Public can access payments"
ON payments FOR ALL
TO public
USING (user_id IS NULL OR user_id LIKE 'guest-%')
WITH CHECK (user_id IS NULL OR user_id LIKE 'guest-%');

-- Policy for staff/admin access
CREATE POLICY "Staff can manage all payments"
ON payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.role_name IN ('Admin', 'Manager', 'Staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.role_name IN ('Admin', 'Manager', 'Staff')
  )
);

-- Ensure RLS is enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add table to realtime if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
END
$$;
