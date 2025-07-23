-- First ensure the roles table has a unique constraint on role_name
-- Check if constraint exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'roles_role_name_key' 
        AND conrelid = 'roles'::regclass
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);
    END IF;
END
$$;

-- Add new roles to the roles table using a safer approach that avoids ID conflicts
DO $$
BEGIN
    -- Insert Driver role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Driver') THEN
        INSERT INTO roles (role_name) VALUES ('Driver');
    END IF;
    
    -- Insert Mechanic role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Mechanic') THEN
        INSERT INTO roles (role_name) VALUES ('Mechanic');
    END IF;
    
    -- Insert Finance role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Finance') THEN
        INSERT INTO roles (role_name) VALUES ('Finance');
    END IF;
END
$$;

-- Enable realtime for roles table only if it's not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'roles'
    ) THEN
        alter publication supabase_realtime add table roles;
    END IF;
END
$$;