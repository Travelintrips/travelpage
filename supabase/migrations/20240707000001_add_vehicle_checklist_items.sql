-- Add more vehicle checklist items
INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Ban depan kiri', 'Kondisi ban depan kiri', 'Exterior', 250000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Ban depan kiri');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Ban depan kanan', 'Kondisi ban depan kanan', 'Exterior', 250000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Ban depan kanan');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Ban belakang kiri', 'Kondisi ban belakang kiri', 'Exterior', 250000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Ban belakang kiri');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Ban belakang kanan', 'Kondisi ban belakang kanan', 'Exterior', 250000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Ban belakang kanan');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Body', 'Kondisi body (depan/belakang/samping)', 'Exterior', 500000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Body');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Lampu', 'Kondisi lampu depan/belakang', 'Exterior', 300000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Lampu');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Interior', 'Kondisi interior (kursi, dashboard)', 'Interior', 400000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Interior');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'AC', 'Kondisi sistem AC', 'Interior', 350000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'AC');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Audio', 'Kondisi sistem audio', 'Interior', 200000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Audio');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Mesin', 'Kondisi mesin kendaraan', 'Mechanical', 1000000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Mesin');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Kaca & spion', 'Kondisi kaca dan spion', 'Exterior', 350000, true
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Kaca & spion');

INSERT INTO checklist_items (item_name, description, category, damage_value, is_required)
SELECT 'Toolkit', 'Kelengkapan toolkit kendaraan', 'Accessories', 150000, false
WHERE NOT EXISTS (SELECT 1 FROM checklist_items WHERE item_name = 'Toolkit');

-- Add to realtime publication
alter publication supabase_realtime add table checklist_items;