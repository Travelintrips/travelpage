-- Add foreign key relationship between users and roles tables
ALTER TABLE users
ADD CONSTRAINT fk_users_roles
FOREIGN KEY (role_id)
REFERENCES roles(role_id);

-- Add this table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE users;
