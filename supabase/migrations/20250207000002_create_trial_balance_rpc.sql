CREATE OR REPLACE FUNCTION get_trial_balance_by_date_range(
  start_date_str TEXT,
  end_date_str TEXT
)
RETURNS TABLE (
  account_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.account_name,
    tb.total_debit,
    tb.total_credit,
    tb.balance
  FROM public.trial_balance_view tb
  WHERE tb.period_start >= to_date(start_date_str, 'DD/MM/YYYY')
    AND tb.period_end <= to_date(end_date_str, 'DD/MM/YYYY')
  ORDER BY tb.account_name;
END;
$$ LANGUAGE plpgsql;