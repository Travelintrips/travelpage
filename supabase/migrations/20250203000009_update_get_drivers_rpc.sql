DROP FUNCTION IF EXISTS public.get_drivers();

CREATE OR REPLACE FUNCTION public.get_driver_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_drivers_count integer;
    active_drivers_count integer;
    online_drivers_count integer;
    minus_balance_total numeric;
    minus_balance_driver_count integer;
    result json;
BEGIN
    -- Count total drivers
    SELECT COUNT(*)
    INTO total_drivers_count
    FROM public.drivers;

    -- Count active drivers (only account_status='active')
    SELECT COUNT(*)
    INTO active_drivers_count
    FROM public.drivers
    WHERE account_status = 'active';

    -- Count online drivers (is_online=true AND account_status='active')
    SELECT COUNT(*)
    INTO online_drivers_count
    FROM public.drivers
    WHERE is_online = true AND account_status = 'active';

    -- Sum of negative balances
    SELECT COALESCE(SUM(saldo), 0)
    INTO minus_balance_total
    FROM public.drivers
    WHERE saldo < 0;

    -- Count drivers with negative balance
    SELECT COUNT(*)
    INTO minus_balance_driver_count
    FROM public.drivers
    WHERE saldo < 0;

    -- Build result JSON
    result := json_build_object(
        'total_drivers', total_drivers_count,
        'active_drivers', active_drivers_count,
        'online_drivers', online_drivers_count,
        'minus_balance_total', minus_balance_total,
        'minus_balance_driver_count', minus_balance_driver_count
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_kpis() TO anon;