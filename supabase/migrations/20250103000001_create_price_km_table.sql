-- Create Price KM table for vehicle pricing management
CREATE TABLE IF NOT EXISTS price_km (
  id SERIAL PRIMARY KEY,
  vehicle_type VARCHAR(50) NOT NULL,
  price_per_km DECIMAL(10,2) NOT NULL DEFAULT 0,
  basic_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  surcharge DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_distance DECIMAL(5,2) DEFAULT 8.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_price_km_vehicle_type ON price_km(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_price_km_active ON price_km(is_active);

-- Insert default pricing data
INSERT INTO price_km (vehicle_type, price_per_km, basic_price, surcharge, minimum_distance) VALUES
('Sedan', 3250.00, 75000.00, 40000.00, 8.0),
('SUV', 4000.00, 90000.00, 50000.00, 8.0),
('MPV', 3500.00, 80000.00, 45000.00, 8.0),
('MPV Premium', 4500.00, 100000.00, 60000.00, 8.0),
('Electric', 3000.00, 70000.00, 35000.00, 8.0)
ON CONFLICT DO NOTHING;

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE price_km;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_price_km_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_price_km_updated_at
  BEFORE UPDATE ON price_km
  FOR EACH ROW
  EXECUTE FUNCTION update_price_km_updated_at();
