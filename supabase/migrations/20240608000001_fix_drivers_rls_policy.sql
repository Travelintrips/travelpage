-- Disable RLS on drivers table if it's enabled
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations on drivers table
DROP POLICY IF EXISTS "Allow all operations on drivers" ON drivers;
CREATE POLICY "Allow all operations on drivers"
  ON drivers
  FOR ALL
  USING (true);
