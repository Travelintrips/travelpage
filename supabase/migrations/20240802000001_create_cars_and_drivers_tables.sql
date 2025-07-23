-- Create drivers table if it doesn't exist
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT,
  license_expiry DATE,
  reference_phone TEXT,
  selfie_url TEXT,
  sim_url TEXT,
  kk_url TEXT,
  ktp_url TEXT,
  skck_url TEXT,
  status TEXT DEFAULT 'pending_approval',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table if it doesn't exist
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  license_plate TEXT NOT NULL,
  color TEXT,
  category TEXT,
  status TEXT DEFAULT 'available',
  is_active BOOLEAN DEFAULT TRUE,
  car_image_url TEXT,
  stnk_image_url TEXT,
  bpkb_image_url TEXT,
  front_image_url TEXT,
  back_image_url TEXT,
  side_image_url TEXT,
  interior_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON drivers;
CREATE POLICY "Allow full access to authenticated users"
  ON drivers
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow full access to authenticated users" ON cars;
CREATE POLICY "Allow full access to authenticated users"
  ON cars
  USING (auth.role() = 'authenticated');

-- Add tables to realtime publication
alter publication supabase_realtime add table drivers;
alter publication supabase_realtime add table cars;
