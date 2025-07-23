-- Add skck_url column to drivers table
ALTER TABLE IF EXISTS public.drivers
ADD COLUMN IF NOT EXISTS skck_url TEXT;

-- Add vehicle information columns to drivers table for Driver Mitra
ALTER TABLE IF EXISTS public.drivers
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS license_plate TEXT,
ADD COLUMN IF NOT EXISTS make TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS seats INTEGER,
ADD COLUMN IF NOT EXISTS transmission TEXT,
ADD COLUMN IF NOT EXISTS fuel_type TEXT;

-- Add the table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
  END IF;
END
$$;