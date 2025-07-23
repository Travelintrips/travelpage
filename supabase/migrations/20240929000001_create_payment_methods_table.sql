-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual', 'gateway')),
  provider TEXT,
  api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage payment methods
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;
CREATE POLICY "Admins can manage payment methods"
  ON payment_methods
  USING (auth.uid() IN (
    SELECT user_id FROM staff WHERE role = 'admin'
  ));

-- Allow all authenticated users to view active payment methods
DROP POLICY IF EXISTS "Users can view active payment methods" ON payment_methods;
CREATE POLICY "Users can view active payment methods"
  ON payment_methods FOR SELECT
  USING (is_active = true);

-- Add to realtime publication
alter publication supabase_realtime add table payment_methods;
