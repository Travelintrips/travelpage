-- Fix role assignment lookup by ensuring proper relationships between users and roles tables

-- First, ensure the users table has the correct foreign key relationship to roles
ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_role_id_fkey,
  ADD CONSTRAINT users_role_id_fkey 
  FOREIGN KEY (role_id) 
  REFERENCES public.roles(id) 
  ON DELETE SET NULL;

-- Create a function to assign default role (Customer) if none exists
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role_id is NULL, assign the Customer role (role_id = 10)
  IF NEW.role_id IS NULL THEN
    NEW.role_id := 10; -- Customer role ID
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically assign default role
DROP TRIGGER IF EXISTS ensure_user_has_role ON public.users;
CREATE TRIGGER ensure_user_has_role
  BEFORE INSERT OR UPDATE
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- Update existing users with NULL role_id to have Customer role
UPDATE public.users
SET role_id = 10
WHERE role_id IS NULL;

-- Add this table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
