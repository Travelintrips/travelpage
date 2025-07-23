-- Create baggage_bookings table
CREATE TABLE IF NOT EXISTS baggage_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  flight_number TEXT,
  baggage_size TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration INTEGER NOT NULL,
  storage_location TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  airport TEXT NOT NULL,
  terminal TEXT NOT NULL,
  duration_type TEXT NOT NULL,
  hours INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE baggage_bookings ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own bookings
DROP POLICY IF EXISTS "Users can view own baggage bookings" ON baggage_bookings;
CREATE POLICY "Users can view own baggage bookings"
ON baggage_bookings FOR SELECT
USING (auth.uid() = customer_id);

-- Allow users to insert their own bookings
DROP POLICY IF EXISTS "Users can insert own baggage bookings" ON baggage_bookings;
CREATE POLICY "Users can insert own baggage bookings"
ON baggage_bookings FOR INSERT
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

-- Allow admins to view all bookings
DROP POLICY IF EXISTS "Admins can view all baggage bookings" ON baggage_bookings;
CREATE POLICY "Admins can view all baggage bookings"
ON baggage_bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role_id IN (
      SELECT id FROM roles WHERE role_name = 'Admin'
    )
  )
);

-- Allow admins to update all bookings
DROP POLICY IF EXISTS "Admins can update all baggage bookings" ON baggage_bookings;
CREATE POLICY "Admins can update all baggage bookings"
ON baggage_bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role_id IN (
      SELECT id FROM roles WHERE role_name = 'Admin'
    )
  )
);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE baggage_bookings;