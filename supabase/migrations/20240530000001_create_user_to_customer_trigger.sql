-- Create a trigger function to automatically insert users into customers table

CREATE OR REPLACE FUNCTION insert_user_into_customers()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'Customer' THEN
        INSERT INTO public.customers (id, name, email, phone)
        VALUES (
            NEW.id, 
            NEW.raw_user_meta_data->>'full_name', 
            NEW.email, 
            NEW.raw_user_meta_data->>'phone_number'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS trg_insert_user_into_customers ON auth.users;

-- Create the trigger
CREATE TRIGGER trg_insert_user_into_customers
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION insert_user_into_customers();
