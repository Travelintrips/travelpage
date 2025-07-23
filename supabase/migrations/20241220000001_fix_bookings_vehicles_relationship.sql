-- Fix the relationship between bookings and vehicles tables
-- This migration ensures proper foreign key relationship exists

-- First, ensure vehicles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  year INTEGER,
  type VARCHAR(50),
  category VARCHAR(50),
  price INTEGER NOT NULL DEFAULT 0,
  image VARCHAR(255),
  license_plate VARCHAR(50),
  seats INTEGER,
  transmission VARCHAR(50),
  fuel_type VARCHAR(50),
  available BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'available',
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure bookings table exists with correct structure
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID,
  driver_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_time VARCHAR(50),
  return_time VARCHAR(50),
  driver_option VARCHAR(50) DEFAULT 'self',
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing foreign key constraint if it exists
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_vehicle_id_fkey' 
    AND table_name = 'bookings'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_vehicle_id_fkey;
  END IF;
END
$migration$;

-- Add the foreign key constraint
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_vehicle_id_fkey
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Remove duplicate license plates before adding unique constraint
WITH duplicates AS (
  SELECT id, license_plate,
         ROW_NUMBER() OVER (PARTITION BY license_plate ORDER BY created_at) as rn
  FROM public.vehicles 
  WHERE license_plate IS NOT NULL
)
DELETE FROM public.vehicles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to license_plate if it doesn't exist
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicles_license_plate_unique' 
    AND table_name = 'vehicles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_license_plate_unique UNIQUE (license_plate);
  END IF;
END
$migration$;

-- Ensure sample vehicles exist
INSERT INTO public.vehicles (make, model, year, category, price, image, license_plate, seats, transmission, fuel_type, available)
VALUES
('Toyota', 'Avanza', 2022, 'MPV', 350000, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80', 'B1234CD', 7, 'automatic', 'petrol', true),
('Honda', 'CR-V', 2023, 'SUV', 450000, 'https://images.unsplash.com/photo-1568844293986-ca9c5c1bc2e8?w=800&q=80', 'B5678EF', 5, 'automatic', 'petrol', true),
('Mitsubishi', 'Xpander', 2022, 'MPV', 380000, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80', 'B9012GH', 7, 'automatic', 'petrol', true)
ON CONFLICT (license_plate) DO NOTHING;

-- Add tables to realtime publication (only if not already added)
DO $migration$
BEGIN
  -- Add vehicles table to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'vehicles' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
  
  -- Add bookings table to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'bookings' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END
$migration$;