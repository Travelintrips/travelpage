-- Add Paylabs specific fields to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS va_number TEXT,
ADD COLUMN IF NOT EXISTS payment_url TEXT,
ADD COLUMN IF NOT EXISTS paylabs_transaction_id TEXT;

-- Add index for faster lookups by paylabs_transaction_id
CREATE INDEX IF NOT EXISTS idx_payments_paylabs_transaction_id 
ON payments(paylabs_transaction_id);
