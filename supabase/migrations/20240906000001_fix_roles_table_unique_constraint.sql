-- First, check if role_name column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'roles'
        AND column_name = 'role_name'
    ) THEN
        ALTER TABLE roles ADD COLUMN role_name TEXT;
    END IF;
END $$;

-- Remove any duplicate role_name entries
DELETE FROM roles
WHERE role_id IN (
  SELECT role_id FROM (
    SELECT role_id, role_name, 
    ROW_NUMBER() OVER (PARTITION BY role_name ORDER BY role_id) as row_num
    FROM roles
    WHERE role_name IS NOT NULL
  ) t
  WHERE t.row_num > 1
);

-- Then try to add the unique constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_name_key;
ALTER TABLE roles ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);
