-- Ensure role_id column in roles table is of type int4

-- First check if role_id column exists in roles table
DO $$ 
BEGIN
  -- If role_id column exists, ensure it's of type int4
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_id') THEN
    -- Check if the column is not already int4
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'role_id') != 'integer' THEN
      -- Alter the column type to int4
      ALTER TABLE roles ALTER COLUMN role_id TYPE int4 USING role_id::int4;
    END IF;
  ELSE
    -- If role_id doesn't exist, add it as int4
    ALTER TABLE roles ADD COLUMN role_id int4;
  END IF;
END $$;

-- Enable realtime for the roles table
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
