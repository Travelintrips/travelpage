CREATE OR REPLACE FUNCTION get_general_ledger_by_date_range(
  start_date_str TEXT,
  end_date_str TEXT
)
RETURNS TABLE (
  date DATE,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vgl.date,
    vgl.description,
    vgl.debit,
    vgl.credit
  FROM public.vw_general_ledger vgl
  WHERE vgl.date >= to_date(start_date_str, 'DD/MM/YYYY')
    AND vgl.date <= to_date(end_date_str, 'DD/MM/YYYY')
  ORDER BY vgl.date ASC, vgl.description ASC;
END;
$$;