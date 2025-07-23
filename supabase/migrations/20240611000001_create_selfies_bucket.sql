-- Create the selfies bucket if it doesn't exist
DO $$
BEGIN
    -- This is a workaround since we can't directly check if a bucket exists in SQL
    -- We'll create the bucket through the edge function instead
    NULL;
END
$$;
