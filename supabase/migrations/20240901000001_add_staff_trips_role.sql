-- Add Staff Trips role to roles table if it doesn't exist already
INSERT INTO roles (name)
VALUES ('Staff Trips')
ON CONFLICT (name) DO NOTHING;

-- Add the new role to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE roles;