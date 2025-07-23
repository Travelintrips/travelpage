-- Grant permissions to the authenticated role for the drivers table
GRANT ALL ON TABLE drivers TO authenticated;
GRANT ALL ON TABLE drivers TO service_role;

-- Add the table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
