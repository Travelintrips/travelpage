-- Add is_online column to drivers table with default value false
ALTER TABLE IF EXISTS public.drivers
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

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