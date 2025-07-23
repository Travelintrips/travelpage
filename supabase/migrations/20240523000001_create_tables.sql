-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR NOT NULL
);

-- Create users table that extends auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name VARCHAR,
  email VARCHAR,
  phone_number VARCHAR,
  role_id INT REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vehicle_id INT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR,
  total_amount NUMERIC,
  payment_status VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  booking_id INT REFERENCES bookings(id),
  amount NUMERIC,
  payment_method VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  inspection_type VARCHAR,
  photo_urls JSONB,
  condition_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable realtime for all tables
alter publication supabase_realtime add table roles;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table inspections;

-- Create policies for public access (you can modify these later for more security)
DROP POLICY IF EXISTS "Public roles access" ON roles;
CREATE POLICY "Public roles access"
ON roles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public users access" ON users;
CREATE POLICY "Public users access"
ON users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public bookings access" ON bookings;
CREATE POLICY "Public bookings access"
ON bookings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can manage their own bookings" ON bookings;
CREATE POLICY "Users can manage their own bookings"
ON bookings FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public payments access" ON payments;
CREATE POLICY "Public payments access"
ON payments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments"
ON payments FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public inspections access" ON inspections;
CREATE POLICY "Public inspections access"
ON inspections FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can manage their own inspections" ON inspections;
CREATE POLICY "Users can manage their own inspections"
ON inspections FOR ALL
USING (auth.uid() = user_id);

-- Insert default roles
INSERT INTO roles (role_name) VALUES 
  ('Admin'),
  ('Manager'),
  ('Supervisor'),
  ('Staff'),
  ('HRD')
ON CONFLICT (id) DO NOTHING;