CREATE TABLE IF NOT EXISTS purchase_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL,
  date DATE NOT NULL,
  nama TEXT NOT NULL,
  nama_barang TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  harga_satuan NUMERIC NOT NULL,
  ongkos_kirim NUMERIC DEFAULT 0,
  total_harga NUMERIC NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_request_code ON purchase_request(request_code);
CREATE INDEX IF NOT EXISTS idx_purchase_request_date ON purchase_request(date);
CREATE INDEX IF NOT EXISTS idx_purchase_request_verified_by ON purchase_request(verified_by);

ALTER TABLE purchase_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_request;
CREATE POLICY "Enable read access for all users"
ON purchase_request FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON purchase_request;
CREATE POLICY "Enable insert for authenticated users"
ON purchase_request FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON purchase_request;
CREATE POLICY "Enable update for authenticated users"
ON purchase_request FOR UPDATE
USING (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE purchase_request;