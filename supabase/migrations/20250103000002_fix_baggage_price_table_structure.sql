-- Fix baggage_price table structure and add missing price fields
DROP TABLE IF EXISTS baggage_price;

CREATE TABLE baggage_price (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  small_price NUMERIC NOT NULL DEFAULT 50000,
  medium_price NUMERIC NOT NULL DEFAULT 75000,
  large_price NUMERIC NOT NULL DEFAULT 100000,
  extra_large_price NUMERIC NOT NULL DEFAULT 125000,
  electronic_price NUMERIC NOT NULL DEFAULT 80000,
  surfingboard_price NUMERIC NOT NULL DEFAULT 150000,
  wheelchair_price NUMERIC NOT NULL DEFAULT 60000,
  stickgolf_price NUMERIC NOT NULL DEFAULT 120000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE baggage_price;

CREATE OR REPLACE FUNCTION update_baggage_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_baggage_price_updated_at_trigger ON baggage_price;
CREATE TRIGGER update_baggage_price_updated_at_trigger
BEFORE UPDATE ON baggage_price
FOR EACH ROW
EXECUTE FUNCTION update_baggage_price_updated_at();

INSERT INTO baggage_price (
  small_price, 
  medium_price, 
  large_price, 
  extra_large_price,
  electronic_price,
  surfingboard_price,
  wheelchair_price,
  stickgolf_price
)
SELECT 50000, 75000, 100000, 125000, 80000, 150000, 60000, 120000
WHERE NOT EXISTS (SELECT 1 FROM baggage_price);
