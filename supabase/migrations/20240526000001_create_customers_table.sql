-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT,
  email TEXT,
  phone TEXT
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own customer data" ON customers;
CREATE POLICY "Users can view their own customer data"
  ON customers FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own customer data" ON customers;
CREATE POLICY "Users can update their own customer data"
  ON customers FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin users can view all customer data" ON customers;
CREATE POLICY "Admin users can view all customer data"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE role_name = 'Admin')
    )
  );

DROP POLICY IF EXISTS "Admin users can update all customer data" ON customers;
CREATE POLICY "Admin users can update all customer data"
  ON customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE role_name = 'Admin')
    )
  );

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'customers'
  ) THEN
    alter publication supabase_realtime add table customers;
  END IF;
END$$;
