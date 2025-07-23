-- Check if the baggage_price table exists, if not create it
CREATE TABLE IF NOT EXISTS baggage_price (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  small_price VARCHAR NOT NULL DEFAULT '50000',
  medium_price VARCHAR NOT NULL DEFAULT '75000',
  large_price VARCHAR NOT NULL DEFAULT '100000',
  extra_large_price VARCHAR NOT NULL DEFAULT '150000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table is already in realtime publication from previous migration
-- No need to add it again

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_baggage_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_baggage_price_updated_at ON baggage_price;
CREATE TRIGGER update_baggage_price_updated_at
BEFORE UPDATE ON baggage_price
FOR EACH ROW
EXECUTE FUNCTION update_baggage_price_updated_at();

-- Create RLS policies for baggage_price
ALTER TABLE baggage_price ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to authenticated users" ON baggage_price;
CREATE POLICY "Allow full access to authenticated users"
ON baggage_price
USING (auth.role() = 'authenticated');
