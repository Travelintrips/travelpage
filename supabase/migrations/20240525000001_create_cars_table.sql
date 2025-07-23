CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model VARCHAR NOT NULL,
  make VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  license_plate VARCHAR,
  color VARCHAR,
  status VARCHAR DEFAULT 'available',
  daily_rate DECIMAL(10, 2),
  mileage INTEGER,
  fuel_type VARCHAR,
  transmission VARCHAR,
  category VARCHAR,
  seats INTEGER,
  image_url VARCHAR
);

alter publication supabase_realtime add table cars;
