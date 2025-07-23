-- Fix user registration trigger to be more robust

-- Drop the existing trigger function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a more robust trigger function that doesn't try to access metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert the ID and email, avoiding any metadata access
  INSERT INTO public.users (id, email)
  VALUES (
    NEW.id,
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
