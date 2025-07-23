-- Add role column to staff table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_name='staff' AND column_name='role') THEN
    ALTER TABLE staff ADD COLUMN role TEXT;
  END IF;
END $$;
