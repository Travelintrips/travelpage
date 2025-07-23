-- Make nullable columns in staff table
DO $$ 
BEGIN
  ALTER TABLE staff ALTER COLUMN department DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN position DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN employee_id DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN first_name DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN last_name DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN address DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN ktp_number DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN religion DROP NOT NULL;
  ALTER TABLE staff ALTER COLUMN ethnicity DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    -- If any error occurs, do nothing (columns might already be nullable)
    NULL;
END $$;