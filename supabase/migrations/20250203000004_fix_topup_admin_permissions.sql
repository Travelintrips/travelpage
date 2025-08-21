-- Fix topup request permissions for Super Admin and Staff Admin roles

-- Update verify_topup function to handle role-based permissions
CREATE OR REPLACE FUNCTION public.verify_topup(p_request_id uuid, p_note text default null)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_status text;
  v_user_role text;
  v_current_user_id uuid;
  v_has_admin_access boolean := false;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if user has admin role in users table (by role string)
  SELECT u.role INTO v_user_role 
  FROM users u 
  WHERE u.id = v_current_user_id;
  
  IF v_user_role IN ('Admin', 'Super Admin', 'Staff Admin') THEN
    v_has_admin_access := true;
  END IF;
  
  -- If no admin access found in users table, check staff table
  IF NOT v_has_admin_access THEN
    SELECT s.role INTO v_user_role 
    FROM staff s 
    WHERE s.id = v_current_user_id;
    
    IF v_user_role IN ('Admin', 'Super Admin', 'Staff Admin') THEN
      v_has_admin_access := true;
    END IF;
  END IF;
  
  -- Check if user has admin permissions
  IF NOT v_has_admin_access THEN
    RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if request exists and is pending
  SELECT status INTO v_status FROM topup_requests WHERE id = p_request_id FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Topup request not found';
  END IF;
  
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;
  
  -- Update the request
  UPDATE topup_requests
  SET status = 'verified',
      verified_at = now(),
      verified_by = v_current_user_id,
      note = coalesce(p_note, note)
  WHERE id = p_request_id;
END $$;

-- Update reject_topup function to handle role-based permissions
CREATE OR REPLACE FUNCTION public.reject_topup(p_request_id uuid, p_admin uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_status text;
  v_user_role text;
  v_current_user_id uuid;
  v_has_admin_access boolean := false;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if user has admin role in users table (by role string)
  SELECT u.role INTO v_user_role 
  FROM users u 
  WHERE u.id = v_current_user_id;
  
  IF v_user_role IN ('Admin', 'Super Admin', 'Staff Admin') THEN
    v_has_admin_access := true;
  END IF;
  
  -- If no admin access found in users table, check staff table
  IF NOT v_has_admin_access THEN
    SELECT s.role INTO v_user_role 
    FROM staff s 
    WHERE s.id = v_current_user_id;
    
    IF v_user_role IN ('Admin', 'Super Admin', 'Staff Admin') THEN
      v_has_admin_access := true;
    END IF;
  END IF;
  
  -- Check if user has admin permissions
  IF NOT v_has_admin_access THEN
    RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if request exists and is pending
  SELECT status INTO v_status FROM topup_requests WHERE id = p_request_id FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Topup request not found';
  END IF;
  
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;
  
  -- Update the request
  UPDATE topup_requests
  SET status = 'rejected',
      verified_at = now(),
      verified_by = v_current_user_id,
      note = coalesce(p_reason, note)
  WHERE id = p_request_id;
END $$;

-- Update RLS policies for topup_requests table
DROP POLICY IF EXISTS "Admin can manage topup requests" ON topup_requests;
CREATE POLICY "Admin can manage topup requests"
ON topup_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('Admin', 'Super Admin', 'Staff Admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.id = auth.uid() 
    AND s.role IN ('Admin', 'Super Admin', 'Staff Admin')
  )
);

-- Allow agents to view their own requests
DROP POLICY IF EXISTS "Agents can view own topup requests" ON topup_requests;
CREATE POLICY "Agents can view own topup requests"
ON topup_requests FOR SELECT
USING (user_id = auth.uid());

-- Allow agents to create their own requests
DROP POLICY IF EXISTS "Agents can create topup requests" ON topup_requests;
CREATE POLICY "Agents can create topup requests"
ON topup_requests FOR INSERT
WITH CHECK (user_id = auth.uid());