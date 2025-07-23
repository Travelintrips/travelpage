-- Create API settings table
CREATE TABLE IF NOT EXISTS api_settings (
  id BIGINT PRIMARY KEY,
  google_maps_key TEXT,
  fonte_api_key TEXT,
  openai_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to realtime publication
alter publication supabase_realtime add table api_settings;

-- Create RLS policies
DROP POLICY IF EXISTS "Admin users can read api_settings" ON api_settings;
CREATE POLICY "Admin users can read api_settings"
  ON api_settings FOR SELECT
  USING (auth.jwt() ->> 'role' = 'Admin');

DROP POLICY IF EXISTS "Admin users can insert api_settings" ON api_settings;
CREATE POLICY "Admin users can insert api_settings"
  ON api_settings FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

DROP POLICY IF EXISTS "Admin users can update api_settings" ON api_settings;
CREATE POLICY "Admin users can update api_settings"
  ON api_settings FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'Admin');

-- Enable RLS
ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;
