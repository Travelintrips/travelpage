-- Add payment proof fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_proof ON bookings(payment_proof_url);
