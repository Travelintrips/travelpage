CREATE TABLE IF NOT EXISTS order_domestik_kargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_order text UNIQUE,
  status text DEFAULT 'draft',

  asal text,
  tujuan text,

  nama_pengirim text,
  perusahaan_pengirim text,
  telepon_pengirim text,
  email_pengirim text,
  alamat_pengirim text,

  nama_penerima text,
  perusahaan_penerima text,
  telepon_penerima text,
  email_penerima text,
  alamat_penerima text,

  jenis_kargo text,
  tipe_kargo text,
  deskripsi_barang text,
  jumlah_koli integer,
  berat_aktual numeric,
  panjang numeric,
  lebar numeric,
  tinggi numeric,
  berat_volume numeric,
  berat_chargeable numeric,

  tarif_per_kg numeric,
  subtotal numeric,
  biaya_admin numeric,
  ppn numeric,
  total numeric,

  is_dangerous_goods boolean DEFAULT false,
  is_live_animals boolean DEFAULT false,
  is_marine_products boolean DEFAULT false,
  special_handling_notes text,

  pickup_required boolean DEFAULT false,
  pickup_address text,
  pickup_date date,
  pickup_time text,

  packing_required boolean DEFAULT false,
  insurance_required boolean DEFAULT false,
  declared_value numeric,

  catatan text,

  cart_id uuid,
  user_id uuid,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_kode_order_domestik()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kode_order IS NULL THEN
    NEW.kode_order := 'ODK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_kode_order_domestik ON order_domestik_kargo;
CREATE TRIGGER set_kode_order_domestik
  BEFORE INSERT ON order_domestik_kargo
  FOR EACH ROW EXECUTE FUNCTION generate_kode_order_domestik();
