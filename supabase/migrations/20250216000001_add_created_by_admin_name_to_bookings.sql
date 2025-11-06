ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_admin_name TEXT;

COMMENT ON COLUMN bookings.created_by_admin_name IS 'Nama admin yang membuat booking';
