CREATE TABLE IF NOT EXISTS paylabs_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'production')),
  merchant_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mode)
);

CREATE INDEX IF NOT EXISTS idx_paylabs_config_mode ON paylabs_config(mode);

alter publication supabase_realtime add table paylabs_config;
