-- Fix the trigger function to properly handle phone_number

CREATE OR REPLACE FUNCTION insert_user_into_customers()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into customers table if role is Customer
    IF NEW.raw_user_meta_data->>'role' = 'Customer' THEN
        INSERT INTO public.customers (id, name, email, phone)
        VALUES (
            NEW.id, 
            NEW.raw_user_meta_data->>'full_name', 
            NEW.email, 
            NEW.raw_user_meta_data->>'phone_number'
        );
    END IF;
    
    -- Always insert into users table regardless of role
    INSERT INTO public.users (id, email, full_name, phone_number, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'role'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        role = EXCLUDED.role;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
