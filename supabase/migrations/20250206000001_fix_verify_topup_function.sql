-- Fix verify_topup function to properly update user saldo
CREATE OR REPLACE FUNCTION public.verify_topup(p_request_id uuid, p_note text default null)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_status text;
  v_user_id uuid;
  v_amount numeric;
  v_current_saldo numeric;
  v_new_saldo numeric;
BEGIN
  -- Check if request exists and is pending
  SELECT status, user_id, amount INTO v_status, v_user_id, v_amount 
  FROM topup_requests 
  WHERE id = p_request_id FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Topup request not found';
  END IF;
  
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;

  -- Get current user saldo
  SELECT COALESCE(saldo, 0) INTO v_current_saldo 
  FROM users 
  WHERE id = v_user_id;
  
  -- Calculate new saldo
  v_new_saldo := v_current_saldo + v_amount;
  
  -- Update topup request status
  UPDATE topup_requests
  SET status = 'verified',
      verified_at = now(),
      verified_by = auth.uid(),
      note = COALESCE(p_note, note)
  WHERE id = p_request_id;
  
  -- Update user saldo
  UPDATE users
  SET saldo = v_new_saldo,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Also update drivers table if user is a driver
  UPDATE drivers
  SET saldo = v_new_saldo,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Create wallet ledger entry
  INSERT INTO wallet_ledger (
    user_id,
    amount,
    direction,
    entry_type,
    ref_id,
    ref_table,
    balance_after
  ) VALUES (
    v_user_id,
    v_amount,
    'credit',
    'topup',
    p_request_id,
    'topup_requests',
    v_new_saldo
  );
  
END $$;

-- Also fix reject_topup function to use auth.uid() for verified_by
CREATE OR REPLACE FUNCTION public.reject_topup(p_request_id uuid, p_admin uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM topup_requests WHERE id=p_request_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;

  UPDATE topup_requests
     SET status='rejected',
         verified_at=now(),
         verified_by=COALESCE(p_admin, auth.uid()),
         note = COALESCE(p_reason, note)
   WHERE id=p_request_id;
END $$;

-- Create overloaded version without p_admin parameter
CREATE OR REPLACE FUNCTION public.reject_topup(p_request_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM topup_requests WHERE id=p_request_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;

  UPDATE topup_requests
     SET status='rejected',
         verified_at=now(),
         verified_by=auth.uid(),
         note = COALESCE(p_reason, note)
   WHERE id=p_request_id;
END $$;
