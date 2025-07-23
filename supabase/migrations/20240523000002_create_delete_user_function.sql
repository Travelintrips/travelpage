-- Create a function to delete a user from auth.users
-- This will be called by the delete-user edge function

CREATE OR REPLACE FUNCTION delete_user_by_id(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id;
  
  -- The public.users record will be deleted by the edge function
  -- or could be handled by a trigger if needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION delete_user_by_id(UUID) TO service_role;
