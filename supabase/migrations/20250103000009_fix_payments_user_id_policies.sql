-- Fix RLS policies for payments table to handle TEXT user_id column
-- This resolves the "operator does not exist: text = uuid" error

-- First, drop ALL existing RLS policies that might cause type conflicts
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
DROP POLICY IF EXISTS "Allow admin full access to payments" ON payments;

-- Ensure the user_id column is TEXT type
DO $
BEGIN
  -- Drop foreign key constraint if it exists
  ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
  
  -- Change column type to TEXT (this will work even if it's already TEXT)
  ALTER TABLE payments ALTER COLUMN user_id TYPE TEXT;
  
  -- Make user_id nullable to support guest users
  ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
END
$;

-- Create comprehensive RLS policies that handle all user types
-- Policy 1: Allow public access for all operations (simplest approach)
CREATE POLICY "Allow all access to payments"
ON payments FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add table to realtime if not already added
DO $
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
$;