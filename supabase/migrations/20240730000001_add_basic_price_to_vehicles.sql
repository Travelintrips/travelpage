-- Add basic_price column to vehicles table if it doesn't exist
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS basic_price NUMERIC DEFAULT 0;

-- Update existing vehicles with default basic_price values
UPDATE vehicles SET basic_price = daily_rate WHERE basic_price IS NULL OR basic_price = 0;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;