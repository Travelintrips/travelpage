ALTER TABLE order_domestik_kargo
  ADD COLUMN IF NOT EXISTS dg_un_number text,
  ADD COLUMN IF NOT EXISTS dg_msds text,
  ADD COLUMN IF NOT EXISTS dg_packing_instruction text,
  ADD COLUMN IF NOT EXISTS dg_declaration boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS la_jenis_hewan text,
  ADD COLUMN IF NOT EXISTS la_jumlah integer,
  ADD COLUMN IF NOT EXISTS la_ventilasi text,
  ADD COLUMN IF NOT EXISTS la_feeding_instruction text,
  ADD COLUMN IF NOT EXISTS mp_kondisi text,
  ADD COLUMN IF NOT EXISTS mp_suhu text,
  ADD COLUMN IF NOT EXISTS mp_jenis_kemasan text,
  ADD COLUMN IF NOT EXISTS mp_ice_gel_pack boolean DEFAULT false;
