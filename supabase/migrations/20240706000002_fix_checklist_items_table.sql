-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create checklist_items table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  damage_value INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read checklist items
DROP POLICY IF EXISTS "Authenticated users can read checklist items" ON checklist_items;
CREATE POLICY "Authenticated users can read checklist items"
  ON checklist_items FOR SELECT
  USING (true);

-- Insert some default checklist items if the table is empty
INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Exterior Clean', 'Vehicle exterior is clean and presentable', 'Cleanliness', 150000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Exterior Clean');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Interior Clean', 'Vehicle interior is clean and presentable', 'Cleanliness', 150000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Interior Clean');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Headlights Working', 'All headlights are functioning properly', 'Lighting', 200000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Headlights Working');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Taillights Working', 'All taillights are functioning properly', 'Lighting', 150000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Taillights Working');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Tires in Good Condition', 'All tires have adequate tread and proper inflation', 'Mechanical', 500000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Tires in Good Condition');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Spare Tire Present', 'Vehicle has a spare tire in good condition', 'Equipment', 300000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Spare Tire Present');

INSERT INTO checklist_items (item_name, description, category, damage_value)
SELECT 'Jack Present', 'Vehicle has a jack and necessary tools', 'Equipment', 100000
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Jack Present');

-- Add to realtime publication
alter publication supabase_realtime add table checklist_items;
