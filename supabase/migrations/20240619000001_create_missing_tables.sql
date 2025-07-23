-- Create vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vehicles (
  id SERIAL PRIMARY KEY,
  make VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  year INTEGER,
  type VARCHAR(50),
  category VARCHAR(50),
  price INTEGER NOT NULL,
  image VARCHAR(255),
  license_plate VARCHAR(50),
  seats INTEGER,
  transmission VARCHAR(50),
  fuel_type VARCHAR(50),
  available BOOLEAN DEFAULT true,
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES public.vehicles(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_time VARCHAR(50),
  return_time VARCHAR(50),
  driver_option VARCHAR(50),
  total_amount INTEGER NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inspections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inspections (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES public.bookings(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inspection_type VARCHAR(50) NOT NULL,
  condition_notes TEXT,
  photo_urls TEXT[],
  exterior_clean BOOLEAN,
  interior_clean BOOLEAN,
  headlights_working BOOLEAN,
  taillights_working BOOLEAN,
  tires_condition BOOLEAN,
  spare_tire_present BOOLEAN,
  jack_present BOOLEAN,
  fuel_level VARCHAR(50),
  odometer_reading INTEGER,
  damage_found BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES public.bookings(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sample vehicle data if the table is empty
INSERT INTO public.vehicles (make, model, year, type, category, price, image, license_plate, seats, transmission, fuel_type, available)
SELECT 'Toyota', 'Avanza', 2022, 'mpv', 'MPV', 350000, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80', 'B1234CD', 7, 'automatic', 'petrol', true
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles LIMIT 1);

INSERT INTO public.vehicles (make, model, year, type, category, price, image, license_plate, seats, transmission, fuel_type, available)
SELECT 'Honda', 'Brio', 2021, 'hatchback', 'City Car', 250000, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80', 'B5678EF', 5, 'automatic', 'petrol', true
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles WHERE make = 'Honda' AND model = 'Brio');

INSERT INTO public.vehicles (make, model, year, type, category, price, image, license_plate, seats, transmission, fuel_type, available)
SELECT 'Toyota', 'Fortuner', 2023, 'suv', 'SUV', 850000, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80', 'B9012GH', 7, 'automatic', 'diesel', true
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles WHERE make = 'Toyota' AND model = 'Fortuner');

-- Disable RLS for these tables during development
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
