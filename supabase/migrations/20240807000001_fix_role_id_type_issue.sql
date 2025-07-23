-- Fix role_id type issue in users table

-- First check if role_id column exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role_id') THEN
    -- Drop the role_id column if it exists and is causing issues
    ALTER TABLE public.users DROP COLUMN IF EXISTS role_id;
    
    -- Add it back as UUID type
    ALTER TABLE public.users ADD COLUMN role_id UUID REFERENCES public.roles(id);
  END IF;
END $$;

-- Update the handle_new_user trigger function to not set role_id
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
