-- Create notifications table (global events)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  type varchar(50) NOT NULL,
  booking_id uuid,
  metadata jsonb
);

-- Create notification_recipients table (per-user copies)
CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_notification 
ON notification_recipients(notification_id, user_id);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_read 
ON notification_recipients(user_id, is_read);

-- Create notify_fanout function
CREATE OR REPLACE FUNCTION notify_fanout(
  service text,
  booking_id uuid,
  title text,
  body text,
  scope text DEFAULT 'ALL',
  role text DEFAULT null,
  target_user uuid DEFAULT null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  notification_id uuid;
BEGIN
  -- Insert into notifications table
  INSERT INTO notifications (message, type, booking_id, metadata)
  VALUES (body, service, booking_id, jsonb_build_object('title', title, 'scope', scope, 'role', role))
  RETURNING id INTO notification_id;

  -- Insert into notification_recipients based on scope
  IF scope = 'ALL' THEN
    -- Insert for all users
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, id FROM auth.users;
    
  ELSIF scope = 'ROLE' AND role IS NOT NULL THEN
    -- Insert for users with specific role from users table
    INSERT INTO notification_recipients (notification_id, user_id)
    SELECT notification_id, u.id 
    FROM auth.users u
    LEFT JOIN users usr ON u.id = usr.id
    LEFT JOIN roles r ON usr.role_id = r.role_id
    WHERE r.role_name = role OR u.raw_user_meta_data->>'role' = role;
    
  ELSIF scope = 'USER' AND target_user IS NOT NULL THEN
    -- Insert for specific user
    INSERT INTO notification_recipients (notification_id, user_id)
    VALUES (notification_id, target_user);
    
  END IF;
END;
$;

-- Enable realtime for notification_recipients
ALTER PUBLICATION supabase_realtime ADD TABLE notification_recipients;
