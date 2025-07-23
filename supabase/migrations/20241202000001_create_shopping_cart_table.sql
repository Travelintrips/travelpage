CREATE TABLE IF NOT EXISTS shopping_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id), -- NULLABLE untuk guest
  item_type text CHECK (item_type IN ('baggage', 'airport_transfer', 'car')),
  item_id uuid,
  service_name text,
  price numeric,
  created_at timestamp DEFAULT now()
);

-- Disable RLS by default
ALTER TABLE shopping_cart DISABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_cart;
