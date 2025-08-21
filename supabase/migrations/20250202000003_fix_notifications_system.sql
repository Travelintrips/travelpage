-- Remove foreign key constraint from notifications table
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_booking_id_fkey;

-- Add booking_type column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS booking_type TEXT;

-- Update notify_fanout function to accept and store booking_type
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
    -- Insert for all users except Customer role
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, u.id 
    FROM auth.users u
    WHERE COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'ROLE' AND role IS NOT NULL THEN
    -- Insert for users with specific role from users table
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN roles r ON usr.role_id = r.role_id
    WHERE (r.role_name = role OR u.raw_user_meta_data->>'role' = role)
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  ELSIF scope = 'USER' AND target_user IS NOT NULL THEN
    -- Insert for specific user (only if not Customer)
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, target_user
    FROM auth.users u
    WHERE u.id = target_user
    AND COALESCE(u.raw_user_meta_data->>'role', 'Customer') != 'Customer';
    
  END IF;
END;
$function$;

-- Update trigger functions to include booking_type
CREATE OR REPLACE FUNCTION trigger_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('booking', NEW.id, 'Pesanan Baru', 'Pesanan baru telah dibuat', 'rentcar', 'ALL');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION trigger_airport_transfer_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('airport_transfer', NEW.id, 'Transfer Bandara Baru', 'Transfer bandara baru telah dibuat', 'airport_transfer', 'ALL');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION trigger_baggage_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('baggage_booking', NEW.id, 'Booking Bagasi Baru', 'Booking bagasi baru telah dibuat', 'ALL', '', NULL);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION trigger_handling_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('handling_booking', NEW.id, 'Handling Booking Baru', 'Handling booking baru telah dibuat', 'handling', 'ALL');
  END IF;
  RETURN NEW;
END;
$function$;
