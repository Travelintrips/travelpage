CREATE OR REPLACE FUNCTION get_histori_transaksi(
  search_term TEXT DEFAULT NULL,
  selected_name TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  page_size INT DEFAULT 50,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  date TEXT,
  name TEXT,
  code_booking TEXT,
  nominal NUMERIC,
  saldo_awal NUMERIC,
  saldo_akhir NUMERIC,
  jenis_transaksi TEXT,
  payment_method TEXT,
  status TEXT,
  bank_name TEXT,
  account_holder_received TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(vw.date, 'DD/MM/YYYY') as date,
    vw.name,
    vw.code_booking,
    vw.nominal,
    COALESCE(vw.saldo_awal, 0) as saldo_awal,
    COALESCE(vw.saldo_akhir, 0) as saldo_akhir,
    vw.jenis_transaksi,
    vw.payment_method,
    vw.status,
    vw.bank_name,
    vw.account_holder_received
  FROM public.vw_histori_transaksi vw
  WHERE 
    (search_term IS NULL OR vw.code_booking ILIKE '%' || search_term || '%')
    AND (selected_name IS NULL OR vw.name = selected_name)
    AND (start_date IS NULL OR vw.date >= start_date)
    AND (end_date IS NULL OR vw.date <= end_date)
  ORDER BY vw.date DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;