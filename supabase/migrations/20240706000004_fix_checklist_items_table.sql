-- Create checklist_items table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  damage_value INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default checklist items if the table is empty
INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Exterior Clean', 'Vehicle exterior is clean and presentable', 'Cleanliness', 150000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Exterior Clean');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Interior Clean', 'Vehicle interior is clean and presentable', 'Cleanliness', 150000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Interior Clean');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Headlights Working', 'All headlights are functioning properly', 'Lighting', 200000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Headlights Working');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Taillights Working', 'All taillights are functioning properly', 'Lighting', 150000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Taillights Working');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Tires in Good Condition', 'All tires have adequate tread and proper inflation', 'Mechanical', 500000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Tires in Good Condition');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Spare Tire Present', 'Vehicle has a spare tire in good condition', 'Equipment', 300000, false
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Spare Tire Present');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Jack Present', 'Vehicle has a jack and necessary tools', 'Equipment', 100000, false
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Jack Present');

-- Add to realtime publication
alter publication supabase_realtime add table checklist_items;