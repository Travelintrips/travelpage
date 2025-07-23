-- Check and fix Melsa Racita's account role assignment
-- This migration will verify the user's role and correct it if needed

-- First, let's check if Melsa Racita exists in the users table
DO $$
DECLARE
    user_record RECORD;
    staff_record RECORD;
    role_record RECORD;
    staff_role_id INTEGER;
BEGIN
    -- Check for Melsa Racita in users table (case insensitive)
    SELECT * INTO user_record 
    FROM users 
    WHERE LOWER(full_name) LIKE '%melsa%racita%' 
       OR LOWER(email) LIKE '%melsa%racita%'
    LIMIT 1;
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Found user: ID=%, Email=%, Full Name=%, Role=%, Role ID=%', 
            user_record.id, user_record.email, user_record.full_name, user_record.role, user_record.role_id;
        
        -- Check if user exists in staff table
        SELECT * INTO staff_record 
        FROM staff 
        WHERE id = user_record.id;
        
        IF staff_record.id IS NOT NULL THEN
            RAISE NOTICE 'Found in staff table: Role=%, Department=%, Position=%', 
                staff_record.role, staff_record.department, staff_record.position;
        ELSE
            RAISE NOTICE 'User NOT found in staff table';
        END IF;
        
        -- Get the Staff Trips role ID
        SELECT role_id INTO staff_role_id 
        FROM roles 
        WHERE role_name = 'Staff Trips';
        
        IF staff_role_id IS NOT NULL THEN
            RAISE NOTICE 'Staff Trips role ID: %', staff_role_id;
            
            -- Check if user's role needs to be updated
            IF user_record.role != 'Staff Trips' OR user_record.role_id != staff_role_id THEN
                RAISE NOTICE 'Updating user role from % to Staff Trips', user_record.role;
                
                -- Update users table
                UPDATE users 
                SET role = 'Staff Trips', 
                    role_id = staff_role_id,
                    updated_at = NOW()
                WHERE id = user_record.id;
                
                RAISE NOTICE 'Updated users table for user %', user_record.id;
            ELSE
                RAISE NOTICE 'User role is already correct: %', user_record.role;
            END IF;
            
            -- Ensure user exists in staff table with correct role
            IF staff_record.id IS NULL THEN
                RAISE NOTICE 'Creating staff record for user %', user_record.id;
                
                INSERT INTO staff (
                    id, 
                    user_id, 
                    name, 
                    email, 
                    phone, 
                    role,
                    department,
                    position,
                    created_at,
                    updated_at
                ) VALUES (
                    user_record.id,
                    user_record.id,
                    user_record.full_name,
                    user_record.email,
                    user_record.phone_number,
                    'Staff Trips',
                    'Operations',
                    'Staff',
                    NOW(),
                    NOW()
                ) ON CONFLICT (id) DO UPDATE SET
                    role = 'Staff Trips',
                    updated_at = NOW();
                    
                RAISE NOTICE 'Created/Updated staff record for user %', user_record.id;
            ELSE
                -- Update existing staff record if role is wrong
                IF staff_record.role != 'Staff Trips' THEN
                    UPDATE staff 
                    SET role = 'Staff Trips',
                        updated_at = NOW()
                    WHERE id = user_record.id;
                    
                    RAISE NOTICE 'Updated staff role to Staff Trips for user %', user_record.id;
                END IF;
            END IF;
            
        ELSE
            RAISE NOTICE 'Staff Trips role not found in roles table';
        END IF;
        
    ELSE
        RAISE NOTICE 'Melsa Racita not found in users table';
        
        -- Let's also check customers table in case she's there
        SELECT * INTO user_record 
        FROM customers 
        WHERE LOWER(full_name) LIKE '%melsa%racita%' 
           OR LOWER(name) LIKE '%melsa%racita%'
           OR LOWER(email) LIKE '%melsa%racita%'
        LIMIT 1;
        
        IF user_record.id IS NOT NULL THEN
            RAISE NOTICE 'Found Melsa Racita in customers table: ID=%, Email=%, Name=%', 
                user_record.id, user_record.email, COALESCE(user_record.full_name, user_record.name);
                
            -- Check if this customer should be a staff member
            -- We'll need to move them from customers to staff
            RAISE NOTICE 'Customer found - may need to be converted to staff member';
        ELSE
            RAISE NOTICE 'Melsa Racita not found in customers table either';
        END IF;
    END IF;
END $$;

-- Also run a general query to show all users with similar names
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Searching for users with names containing "melsa" or "racita":';
    
    FOR rec IN 
        SELECT id, email, full_name, role, role_id, 'users' as source
        FROM users 
        WHERE LOWER(full_name) LIKE '%melsa%' 
           OR LOWER(full_name) LIKE '%racita%'
           OR LOWER(email) LIKE '%melsa%'
           OR LOWER(email) LIKE '%racita%'
        UNION ALL
        SELECT id, email, COALESCE(full_name, name) as full_name, 'Customer' as role, NULL as role_id, 'customers' as source
        FROM customers 
        WHERE LOWER(COALESCE(full_name, name)) LIKE '%melsa%' 
           OR LOWER(COALESCE(full_name, name)) LIKE '%racita%'
           OR LOWER(email) LIKE '%melsa%'
           OR LOWER(email) LIKE '%racita%'
    LOOP
        RAISE NOTICE 'Found: % - ID=%, Email=%, Name=%, Role=%, Source=%', 
            rec.full_name, rec.id, rec.email, rec.full_name, rec.role, rec.source;
    END LOOP;
END $$;
