-- Create a function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(schema_name text, table_name text)
RETURNS boolean AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name 
    AND information_schema.tables.table_name = $2
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if a table is already in the publication
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

-- Add vehicles table to publication if it exists and is not already added
DO $$
BEGIN
  IF check_table_exists('public', 'vehicles') AND NOT check_publication_tables('supabase_realtime', 'vehicles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  END IF;
END
$$;

-- Add bookings table to publication if it exists and is not already added
DO $$
BEGIN
  IF check_table_exists('public', 'bookings') AND NOT check_publication_tables('supabase_realtime', 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END
$$;

-- Add inspections table to publication if it exists and is not already added
DO $$
BEGIN
  IF check_table_exists('public', 'inspections') AND NOT check_publication_tables('supabase_realtime', 'inspections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
  END IF;
END
$$;

-- Add payments table to publication if it exists and is not already added
DO $$
BEGIN
  IF check_table_exists('public', 'payments') AND NOT check_publication_tables('supabase_realtime', 'payments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END
$$;

-- Drop the functions after use
DROP FUNCTION check_table_exists;
DROP FUNCTION check_publication_tables;
