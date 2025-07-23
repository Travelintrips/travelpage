-- Add more checklist items
INSERT INTO checklist_items (name, description, category, damage_value)
VALUES
  ('Ban depan kiri', 'Kondisi ban depan kiri', 'Exterior', NULL),
  ('Ban depan kanan', 'Kondisi ban depan kanan', 'Exterior', NULL),
  ('Ban belakang kiri', 'Kondisi ban belakang kiri', 'Exterior', NULL),
  ('Ban belakang kanan', 'Kondisi ban belakang kanan', 'Exterior', NULL),
  ('Body', 'Kondisi body (depan/belakang/samping)', 'Exterior', NULL),
  ('Lampu', 'Kondisi lampu depan/belakang', 'Exterior', NULL),
  ('Interior', 'Kondisi interior (kursi, dashboard)', 'Interior', NULL),
  ('AC', 'Kondisi sistem AC', 'Interior', NULL),
  ('Audio', 'Kondisi sistem audio', 'Interior', NULL),
  ('Mesin', 'Kondisi mesin kendaraan', 'Mechanical', NULL),
  ('Kaca & spion', 'Kondisi kaca dan spion', 'Exterior', NULL),
  ('Toolkit', 'Kelengkapan toolkit kendaraan', 'Accessories', NULL);

-- Add to realtime publication
alter publication supabase_realtime add table checklist_items;