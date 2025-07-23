-- Add surcharge column to vehicles table if it doesn't exist
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS surcharge varchar;

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;