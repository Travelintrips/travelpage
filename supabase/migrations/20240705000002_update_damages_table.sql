-- Update damages table to ensure it has all necessary fields
ALTER TABLE IF EXISTS damages
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add the table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE damages;
