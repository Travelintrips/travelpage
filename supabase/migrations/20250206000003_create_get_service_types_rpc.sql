CREATE OR REPLACE FUNCTION get_service_types()
RETURNS TABLE(label text, value text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT 
    service_type AS label, 
    service_type AS value 
  FROM public.journal_entries 
  WHERE service_type IS NOT NULL 
    AND trim(service_type) <> '' 
  ORDER BY 1;
$$;