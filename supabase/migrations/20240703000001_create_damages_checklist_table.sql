-- Create damages_checklist table
CREATE TABLE IF NOT EXISTS damages_checklist (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  damage_value INTEGER NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE damages_checklist;

-- Insert some initial data
INSERT INTO damages_checklist (item_name, damage_value, category, description)
VALUES 
  ('Kaca depan pecah', 500000, 'Kaca', 'Kerusakan pada kaca depan kendaraan'),
  ('Kaca samping pecah', 300000, 'Kaca', 'Kerusakan pada kaca samping kendaraan'),
  ('Spion rusak', 250000, 'Eksterior', 'Kerusakan pada spion kendaraan'),
  ('Goresan pada body', 200000, 'Body', 'Goresan pada body kendaraan'),
  ('Penyok pada body', 350000, 'Body', 'Penyok pada body kendaraan'),
  ('Ban bocor', 100000, 'Ban', 'Kerusakan pada ban kendaraan'),
  ('Velg rusak', 450000, 'Ban', 'Kerusakan pada velg kendaraan'),
  ('Lampu depan pecah', 275000, 'Lampu', 'Kerusakan pada lampu depan kendaraan'),
  ('Lampu belakang pecah', 225000, 'Lampu', 'Kerusakan pada lampu belakang kendaraan'),
  ('Interior kotor', 150000, 'Interior', 'Kondisi interior kotor');
