-- Fix user registration trigger to be more robust without dropping dependencies

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
