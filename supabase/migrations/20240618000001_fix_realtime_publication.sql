-- This migration fixes the error with the supabase_realtime publication
-- by first checking if tables are already members before adding them

-- Function to check if a table is already in the publication
CREATE OR REPLACE FUNCTION check_publication_tables(publication_name text, table_name text)
RETURNS boolean AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = publication_name 
    AND schemaname = 'public' 
    AND tablename = table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$ LANGUAGE plpgsql;

-- Add vehicles table to publication if not already added
DO $$
BEGIN
  IF NOT check_publication_tables('supabase_realtime', 'vehicles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
END
$$;

-- Add bookings table to publication if not already added
DO $$
BEGIN
  IF NOT check_publication_tables('supabase_realtime', 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END
$$;

-- Add inspections table to publication if not already added
DO $$
BEGIN
  IF NOT check_publication_tables('supabase_realtime', 'inspections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
  END IF;
END
$$;

-- Add payments table to publication if not already added
DO $$
BEGIN
  IF NOT check_publication_tables('supabase_realtime', 'payments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END
$$;

-- Drop the function after use
DROP FUNCTION check_publication_tables;
