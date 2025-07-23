-- Create handling_bookings table to store orders from the Handling page
CREATE TABLE IF NOT EXISTS handling_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Customer Information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  
  -- Service Details
  category VARCHAR(100) NOT NULL, -- International/Domestik - Individual/Group
  passenger_area TEXT NOT NULL, -- Area lokasi penumpang
  pickup_area TEXT NOT NULL, -- Area lokasi jemput
  
  -- Flight Information
  flight_number VARCHAR(20) NOT NULL,
  travel_type VARCHAR(20) NOT NULL DEFAULT 'Arrival', -- Arrival, Departure, Transit
  
  -- Date and Time
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL DEFAULT '09:00',
  
  -- Passenger Count (for Group bookings)
  passengers INTEGER DEFAULT 1,
  
  -- Additional Information
  additional_notes TEXT,
  
  -- Pricing Information
  service_price DECIMAL(12,2) DEFAULT 0,
  category_price DECIMAL(12,2) DEFAULT 0, -- Additional price per passenger for group bookings
  total_price DECIMAL(12,2) NOT NULL,
  
  -- Booking Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_handling_bookings_user_id ON handling_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_handling_bookings_status ON handling_bookings(status);
CREATE INDEX IF NOT EXISTS idx_handling_bookings_pickup_date ON handling_bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_handling_bookings_category ON handling_bookings(category);
CREATE INDEX IF NOT EXISTS idx_handling_bookings_created_at ON handling_bookings(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_handling_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handling_bookings_updated_at
  BEFORE UPDATE ON handling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_handling_bookings_updated_at();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE handling_bookings;

-- Add RLS policies (disabled by default as per instructions)
-- Users can only see their own bookings
-- CREATE POLICY "Users can view own handling bookings" ON handling_bookings
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own handling bookings" ON handling_bookings
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update own handling bookings" ON handling_bookings
--   FOR UPDATE USING (auth.uid() = user_id);

-- Add some sample data for testing
INSERT INTO handling_bookings (
  user_id,
  customer_name,
  customer_email,
  customer_phone,
  category,
  passenger_area,
  pickup_area,
  flight_number,
  travel_type,
  pickup_date,
  pickup_time,
  passengers,
  additional_notes,
  service_price,
  category_price,
  total_price,
  status
) VALUES 
(
  NULL, -- For guest users
  'John Doe',
  'john.doe@example.com',
  '+62812345678',
  'International - Individual',
  'Terminal 2F – International Arrival Hall',
  'Terminal 2F – International Departure Check-in',
  'GA123',
  'Arrival',
  '2025-01-15',
  '10:00',
  1,
  'Please wait at gate G6',
  150000,
  0,
  150000,
  'pending'
),
(
  NULL, -- For guest users
  'Jane Smith',
  'jane.smith@example.com',
  '+62812345679',
  'International - Group',
  'Terminal 3 – International Arrival (Gate G6 / Area Umum)',
  'Terminal 3 – International Departure (Check-in & Imigrasi)',
  'SJ182',
  'Departure',
  '2025-01-16',
  '14:30',
  5,
  'Group of 5 passengers with extra luggage',
  200000,
  50000,
  450000, -- 200000 + (50000 * 5)
  'confirmed'
);
