-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add vehicle_type_id column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type_id INTEGER REFERENCES vehicle_types(id);

-- Add vehicle_types to realtime publication
alter publication supabase_realtime add table vehicle_types;

-- Insert some default vehicle types
INSERT INTO vehicle_types (name) VALUES 
  ('Sedan'),
  ('SUV'),
  ('MPV'),
  ('Hatchback'),
  ('Truck'),
  ('Luxury'),
  ('Convertible'),
  ('Coupe'),
  ('Van'),
  ('Minivan')
ON CONFLICT DO NOTHING;
