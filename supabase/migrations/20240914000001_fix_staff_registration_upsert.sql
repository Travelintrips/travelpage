-- Add ON CONFLICT DO UPDATE to staff table

-- Create a function to handle upsert for staff table
CREATE OR REPLACE FUNCTION upsert_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- If the record already exists, update it
  IF EXISTS (SELECT 1 FROM staff WHERE id = NEW.id) THEN
    UPDATE staff
    SET 
      department = NEW.department,
      position = NEW.position,
      employee_id = NEW.employee_id,
      id_card_url = NEW.id_card_url,
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      address = NEW.address,
      ktp_number = NEW.ktp_number,
      religion = NEW.religion,
      ethnicity = NEW.ethnicity,
      role = NEW.role
    WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  -- Otherwise, insert the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS staff_upsert_trigger ON staff;

-- Create the trigger
CREATE TRIGGER staff_upsert_trigger
BEFORE INSERT ON staff
FOR EACH ROW
EXECUTE FUNCTION upsert_staff();