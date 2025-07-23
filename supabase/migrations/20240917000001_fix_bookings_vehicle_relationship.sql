-- Fix the relationship between bookings and vehicles tables

-- First check if the vehicles table exists, if not create it
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  license_plate TEXT UNIQUE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'available',
  type TEXT,
  year INTEGER,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if bookings table exists, if not create it with proper foreign key
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  vehicle_id INTEGER,
  driver_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_vehicle_id_fkey' 
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
  END IF;
END
$$;

-- Enable RLS on both tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can restrict these later)
DROP POLICY IF EXISTS "Public vehicles access" ON vehicles;
CREATE POLICY "Public vehicles access"
ON vehicles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public bookings access" ON bookings;
CREATE POLICY "Public bookings access"
ON bookings FOR SELECT
USING (true);

-- Add tables to realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
