-- Create a separate table for airport transfer payments
CREATE TABLE IF NOT EXISTS airport_transfer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  airport_transfer_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  bank_name TEXT,
  is_partial_payment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE airport_transfer_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts
CREATE POLICY "Allow public inserts for airport transfer payments"
ON airport_transfer_payments
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow users to view their own payments
CREATE POLICY "Allow users to view their airport transfer payments"
ON airport_transfer_payments
FOR SELECT
TO public
USING (true);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE airport_transfer_payments;
