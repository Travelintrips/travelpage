-- Check if the roles table exists and has the name column
DO $$
BEGIN
  -- Check if the roles table is already in the realtime publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'roles'
  ) THEN
    RAISE NOTICE 'Table roles is already in supabase_realtime publication';
  ELSE
    -- Add the roles table to the realtime publication if it's not already there
    ALTER PUBLICATION supabase_realtime ADD TABLE roles;
  END IF;
END$$;
