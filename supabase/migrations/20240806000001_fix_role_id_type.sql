-- Fix role_id type in users table

-- First, ensure the users table has the correct structure
ALTER TABLE IF EXISTS public.users
  ALTER COLUMN role_id TYPE UUID USING role_id::UUID;

-- Fix the handle_new_user trigger function to handle UUID role_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
