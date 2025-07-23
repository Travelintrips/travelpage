-- Create checklist_items table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read checklist items
DROP POLICY IF EXISTS "Authenticated users can read checklist items" ON checklist_items;
CREATE POLICY "Authenticated users can read checklist items"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (true);

-- Allow only admins to modify checklist items
DROP POLICY IF EXISTS "Only admins can insert checklist items" ON checklist_items;
CREATE POLICY "Only admins can insert checklist items"
  ON checklist_items FOR INSERT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Only admins can update checklist items" ON checklist_items;
CREATE POLICY "Only admins can update checklist items"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Only admins can delete checklist items" ON checklist_items;
CREATE POLICY "Only admins can delete checklist items"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add to realtime publication
alter publication supabase_realtime add table checklist_items;

-- Insert some default checklist items if the table is empty
INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Exterior Clean', 'Vehicle exterior is clean and presentable', 'Cleanliness', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Exterior Clean');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Interior Clean', 'Vehicle interior is clean and presentable', 'Cleanliness', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Interior Clean');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Headlights Working', 'All headlights are functioning properly', 'Lighting', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Headlights Working');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Taillights Working', 'All taillights are functioning properly', 'Lighting', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Taillights Working');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Tires in Good Condition', 'All tires have adequate tread and proper inflation', 'Mechanical', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Tires in Good Condition');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Spare Tire Present', 'Vehicle has a spare tire in good condition', 'Equipment', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Spare Tire Present');

INSERT INTO checklist_items (name, description, category, is_required)
SELECT 'Jack Present', 'Vehicle has a jack and necessary tools', 'Equipment', true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE name = 'Jack Present');
