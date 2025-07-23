-- Fix user registration constraints

-- Make email unique in users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Make staff table columns nullable
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
  ALTER TABLE staff ALTER COLUMN role DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;