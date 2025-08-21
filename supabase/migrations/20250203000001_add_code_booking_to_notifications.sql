-- 1. Tambahkan kolom code_booking ke tabel notifications
ALTER TABLE notifications
ADD COLUMN code_booking text;

-- 2. Perbarui function notify_fanout agar menyimpan code_booking
CREATE OR REPLACE FUNCTION notify_fanout(
  body text,
  service text,
  booking_id uuid,
  booking_type text,
  title text,
  scope text,
  code_booking text DEFAULT NULL,
  target_user uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert ke notifications dengan code_booking
  INSERT INTO notifications (message, type, booking_id, booking_type, code_booking, metadata)
  VALUES (
    body,
    service,
    booking_id,
    booking_type,
    code_booking,
    jsonb_build_object('title', title, 'scope', scope)
  )
  RETURNING id INTO notification_id;

  -- Recipients
  IF scope = 'ALL' THEN
    INSERT INTO notification_recipients (notification_id, user_id, is_read, created_at)
    SELECT notification_id, u.id, false, NOW()
    FROM auth.users u;

  ELSIF scope = 'ADMIN' THEN
    INSERT INTO notification_recipients (notification_id, user_id, is_read, created_at)
    SELECT notification_id, u.id, false, NOW()
    FROM auth.users u
    WHERE COALESCE(u.raw_user_meta_data->>'role', '') = 'Admin';

  ELSIF scope = 'USER' AND target_user IS NOT NULL THEN
    INSERT INTO notification_recipients (notification_id, user_id, is_read, created_at)
    VALUES (notification_id, target_user, false, NOW());
  END IF;
END;
$$;
