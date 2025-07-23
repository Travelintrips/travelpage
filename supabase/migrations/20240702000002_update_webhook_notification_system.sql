-- Enable the HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create webhooks table to store webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create webhook_logs table to track webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER REFERENCES webhooks(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for webhooks table
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage webhooks" ON webhooks;
CREATE POLICY "Admins can manage webhooks"
  ON webhooks
  USING (auth.uid() IN (
    SELECT id FROM users WHERE role_id = 1 -- Admin role
  ));

-- Create a function to handle webhook notifications using edge functions instead of net.http_post
CREATE OR REPLACE FUNCTION send_webhook_notification()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload JSONB;
  webhook_log_id INTEGER;
BEGIN
  -- Determine the event type based on the operation and table
  IF TG_OP = 'INSERT' THEN
    payload = jsonb_build_object('event', TG_TABLE_NAME || '.created', 'data', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    payload = jsonb_build_object('event', TG_TABLE_NAME || '.updated', 'data', row_to_json(NEW), 'old_data', row_to_json(OLD));
  ELSIF TG_OP = 'DELETE' THEN
    payload = jsonb_build_object('event', TG_TABLE_NAME || '.deleted', 'data', row_to_json(OLD));
  END IF;

  -- Loop through all active webhooks for this event type
  FOR webhook_record IN 
    SELECT * FROM webhooks 
    WHERE event_type = TG_TABLE_NAME || '.' || LOWER(TG_OP) 
    AND is_active = TRUE
  LOOP
    -- Insert a log entry
    INSERT INTO webhook_logs (webhook_id, event_type, payload, status)
    VALUES (webhook_record.id, webhook_record.event_type, payload, 'pending')
    RETURNING id INTO webhook_log_id;
    
    -- Note: Instead of using net.http_post directly, we'll use an edge function
    -- The actual HTTP request will be handled by the edge function
    -- This is just a placeholder in the database to record that a webhook should be sent
    -- The application will need to poll for pending webhooks and send them using the fetch API
    
    -- Update the log with a note that it needs to be processed by the edge function
    UPDATE webhook_logs 
    SET status = 'queued_for_processing'
    WHERE id = webhook_log_id;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for bookings table
DROP TRIGGER IF EXISTS bookings_webhook_trigger ON bookings;
CREATE TRIGGER bookings_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION send_webhook_notification();

-- Create triggers for payments table
DROP TRIGGER IF EXISTS payments_webhook_trigger ON payments;
CREATE TRIGGER payments_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION send_webhook_notification();

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE webhooks;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_logs;
