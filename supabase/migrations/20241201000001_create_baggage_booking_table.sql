-- Create baggage_booking table to store baggage order information
CREATE TABLE IF NOT EXISTS baggage_booking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  flight_number TEXT,
  baggage_size TEXT NOT NULL CHECK (baggage_size IN ('small', 'medium', 'large', 'extra_large', 'electronic', 'surfingboard', 'wheelchair', 'stickgolf')),
  price NUMERIC NOT NULL,
  duration INTEGER NOT NULL,
  storage_location TEXT DEFAULT 'Terminal 1, Level 1',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  airport TEXT NOT NULL,
  terminal TEXT NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('hours', 'days')),
  hours INTEGER CHECK (hours >= 1 AND hours <= 4),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  customer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_baggage_booking_customer_id ON baggage_booking(customer_id);
CREATE INDEX IF NOT EXISTS idx_baggage_booking_booking_id ON baggage_booking(booking_id);
CREATE INDEX IF NOT EXISTS idx_baggage_booking_status ON baggage_booking(status);
CREATE INDEX IF NOT EXISTS idx_baggage_booking_created_at ON baggage_booking(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE baggage_booking;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_baggage_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_baggage_booking_updated_at
    BEFORE UPDATE ON baggage_booking
    FOR EACH ROW
    EXECUTE FUNCTION update_baggage_booking_updated_at();
