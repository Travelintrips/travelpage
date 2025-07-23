-- Fix staff creation trigger to prevent automatic insertion into customers table
-- Drop the existing trigger that automatically inserts all users into customers table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that inserts data into appropriate tables based on role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $function$
DECLARE
  user_role TEXT;
  user_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract role from metadata, default to 'Customer' if not specified
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Customer');
  
  -- Extract name from metadata, use full_name first, then name, then email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name', 
    NEW.email
  );
  
  -- Extract phone from metadata
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Always insert into users table (main user table)
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_phone,
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  -- Insert into customers table ONLY if role is exactly 'Customer'
  IF user_role = 'Customer' THEN
    INSERT INTO public.customers (id, email, full_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_phone
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;
  END IF;

  -- Skip automatic staff table insertion - let frontend handle it manually
  -- This prevents conflicts when frontend code also inserts into staff table
  -- Staff data will be inserted manually from the frontend registration process

  -- Insert into drivers table if role contains 'Driver'
  IF user_role IN ('Driver Mitra', 'Driver Perusahaan') THEN
    INSERT INTO public.drivers (id, email, full_name, phone, role)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_phone,
      user_role
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for the affected tables (skip users as it's already added)
DO $block$
BEGIN
  -- Add staff table to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff;
  END IF;
  
  -- Add customers table to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
  
  -- Add drivers table to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
  END IF;
END $block$;