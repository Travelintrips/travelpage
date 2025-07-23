-- Add bank details columns to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_holder TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_code TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT;

-- Add these columns to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE payment_methods;