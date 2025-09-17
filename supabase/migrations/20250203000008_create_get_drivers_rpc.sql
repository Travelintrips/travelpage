CREATE OR REPLACE FUNCTION public.get_drivers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_drivers_count integer;
    online_drivers_count integer;
    minus_balance_total numeric;
    result json;
BEGIN
    -- Count active drivers
    SELECT COUNT(*)
    INTO active_drivers_count
    FROM public.drivers
    WHERE account_status = 'active' AND driver_status = 'active';

    -- Count online drivers (active status)
    SELECT COUNT(*)
    INTO online_drivers_count
    FROM public.drivers
    WHERE is_online = true AND account_status = 'active';

    -- Sum of negative balances
    SELECT COALESCE(SUM(saldo), 0)
    INTO minus_balance_total
    FROM public.drivers
    WHERE saldo < 0;

    -- Build result JSON
    result := json_build_object(
        'active_drivers', active_drivers_count,
        'online_drivers', online_drivers_count,
        'minus_balance_total', minus_balance_total
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_drivers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_drivers() TO anon;