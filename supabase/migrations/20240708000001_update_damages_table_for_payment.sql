-- Add payment_status column to damages table if it doesn't exist
ALTER TABLE damages ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add payment_id column to damages table if it doesn't exist
ALTER TABLE damages ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Add the damages table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE damages;
