-- Make staff table columns nullable and fix constraints
DO $$ 
BEGIN
  -- Make all columns nullable
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
  
  -- Add default values for text columns
  ALTER TABLE staff ALTER COLUMN department SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN position SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN employee_id SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN first_name SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN last_name SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN address SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN ktp_number SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN religion SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN ethnicity SET DEFAULT '';
  ALTER TABLE staff ALTER COLUMN role SET DEFAULT '';

EXCEPTION
  WHEN others THEN
    NULL;
END $$;