-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT
);

-- Enable realtime for customers
alter publication supabase_realtime add table customers;

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  status TEXT DEFAULT 'active'
);

-- Enable realtime for drivers
alter publication supabase_realtime add table drivers;
