-- Fix notification policies for Super Admin role

-- Drop existing policies for notifications table
DROP POLICY IF EXISTS "Admin bisa lihat notifikasi" ON notifications;
DROP POLICY IF EXISTS "staff admin bisa view" ON notifications;
DROP POLICY IF EXISTS "Staff Trips bisa lihat notif" ON notifications;
DROP POLICY IF EXISTS "Super Admin bisa lihat notif" ON notifications;

-- Create comprehensive notification policies
CREATE POLICY "Admin can view notifications"
ON notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
  )
  OR
  EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.id = auth.uid() 
    AND s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
  )
  OR
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role_id = 99  -- Super Admin role_id
  )
  OR
  -- Fallback to raw_user_meta_data for backward compatibility
  (auth.uid() IS NOT NULL AND 
   COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic'))
);

-- Drop existing policies for notification_recipients table
DROP POLICY IF EXISTS "Users can see their own notifications" ON notification_recipients;
DROP POLICY IF EXISTS "Users can mark their notifications read" ON notification_recipients;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notification_recipients;

-- Create comprehensive notification_recipients policies
CREATE POLICY "Users can view their own notifications"
ON notification_recipients FOR SELECT
USING (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = auth.uid() 
      AND s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role_id = 99  -- Super Admin role_id
    )
    OR
    -- Fallback to raw_user_meta_data for backward compatibility
    COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
  )
);

CREATE POLICY "Users can update their own notifications"
ON notification_recipients FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = auth.uid() 
      AND s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role_id = 99  -- Super Admin role_id
    )
    OR
    -- Fallback to raw_user_meta_data for backward compatibility
    COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = auth.uid() 
      AND s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role_id = 99  -- Super Admin role_id
    )
    OR
    -- Fallback to raw_user_meta_data for backward compatibility
    COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
  )
);

-- Update the notify_fanout function to properly handle Super Admin role
CREATE OR REPLACE FUNCTION notify_fanout(
  service text,
  booking_id uuid,
  title text,
  body text,
  booking_type text,
  scope text DEFAULT 'ALL',
  role text DEFAULT null,
  target_user uuid DEFAULT null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert into notifications table with booking_type
  INSERT INTO notifications (message, type, booking_id, booking_type, metadata)
  VALUES (body, service, booking_id, booking_type, jsonb_build_object('title', title, 'scope', scope, 'role', role))
  RETURNING id INTO notification_id;

  -- Insert into notification_recipients based on scope
  IF scope = 'ALL' THEN
    -- Insert for all admin users (including Super Admin)
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT DISTINCT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN staff s ON u.id = s.id
    WHERE (
      -- Check users table role
      usr.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR
      -- Check staff table role
      s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR
      -- Check role_id for Super Admin
      usr.role_id = 99
      OR
      -- Fallback to raw_user_meta_data
      COALESCE(u.raw_user_meta_data->>'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'ROLE' AND role IS NOT NULL THEN
    -- Insert for users with specific role
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT DISTINCT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN roles r ON usr.role_id = r.role_id
    LEFT JOIN staff s ON u.id = s.id
    WHERE (
      r.role_name = role 
      OR usr.role = role 
      OR s.role = role 
      OR u.raw_user_meta_data->>'role' = role
      OR (role = 'Super Admin' AND usr.role_id = 99)
    )
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'USER' AND target_user IS NOT NULL THEN
    -- Insert for specific user (only if not Customer)
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, target_user
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    WHERE u.id = target_user
    AND (
      usr.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR usr.role_id = 99
      OR COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer'
    );
    
  END IF;
END;
$function$;

-- Add code_booking column to notifications table if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS code_booking TEXT;

-- Update the notify_fanout function to include code_booking
CREATE OR REPLACE FUNCTION notify_fanout(
  service text,
  booking_id uuid,
  title text,
  body text,
  booking_type text,
  code_booking text DEFAULT null,
  scope text DEFAULT 'ALL',
  role text DEFAULT null,
  target_user uuid DEFAULT null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert into notifications table with booking_type and code_booking
  INSERT INTO notifications (message, type, booking_id, booking_type, code_booking, metadata)
  VALUES (body, service, booking_id, booking_type, code_booking, jsonb_build_object('title', title, 'scope', scope, 'role', role))
  RETURNING id INTO notification_id;

  -- Insert into notification_recipients based on scope
  IF scope = 'ALL' THEN
    -- Insert for all admin users (including Super Admin)
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT DISTINCT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN staff s ON u.id = s.id
    WHERE (
      -- Check users table role
      usr.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR
      -- Check staff table role
      s.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR
      -- Check role_id for Super Admin
      usr.role_id = 99
      OR
      -- Fallback to raw_user_meta_data
      COALESCE(u.raw_user_meta_data->>'role', 'Customer') IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
    )
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'ROLE' AND role IS NOT NULL THEN
    -- Insert for users with specific role
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT DISTINCT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN roles r ON usr.role_id = r.role_id
    LEFT JOIN staff s ON u.id = s.id
    WHERE (
      r.role_name = role 
      OR usr.role = role 
      OR s.role = role 
      OR u.raw_user_meta_data->>'role' = role
      OR (role = 'Super Admin' AND usr.role_id = 99)
    )
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'USER' AND target_user IS NOT NULL THEN
    -- Insert for specific user (only if not Customer)
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, target_user
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    WHERE u.id = target_user
    AND (
      usr.role IN ('Admin', 'Super Admin', 'Staff Admin', 'Staff', 'Staff Trips', 'Staff Traffic')
      OR usr.role_id = 99
      OR COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer'
    );
    
  END IF;
END;
$function$;
