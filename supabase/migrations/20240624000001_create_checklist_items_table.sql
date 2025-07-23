CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  damage_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

alter publication supabase_realtime add table checklist_items;

-- Create policy to allow all operations for authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON checklist_items;
CREATE POLICY "Allow all operations for authenticated users"
ON checklist_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
