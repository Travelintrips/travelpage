-- Create triggers for bookings table
CREATE OR REPLACE FUNCTION trigger_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('booking', NEW.id, 'Pesanan Baru', 'Pesanan baru telah dibuat', 'ALL');
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_notification();

-- Create triggers for airport_transfers table
CREATE OR REPLACE FUNCTION trigger_airport_transfer_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('airport_transfer', NEW.id, 'Transfer Bandara Baru', 'Transfer bandara baru telah dibuat', 'ALL');
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS airport_transfer_notification_trigger ON airport_transfers;
CREATE TRIGGER airport_transfer_notification_trigger
  AFTER INSERT ON airport_transfers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_airport_transfer_notification();

-- Create triggers for baggage_booking table
CREATE OR REPLACE FUNCTION trigger_baggage_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('baggage_booking', NEW.id, 'Booking Bagasi Baru', 'Booking bagasi baru telah dibuat', 'ALL');
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS baggage_booking_notification_trigger ON baggage_booking;
CREATE TRIGGER baggage_booking_notification_trigger
  AFTER INSERT ON baggage_booking
  FOR EACH ROW
  EXECUTE FUNCTION trigger_baggage_booking_notification();

-- Create triggers for handling_bookings table
CREATE OR REPLACE FUNCTION trigger_handling_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_fanout('handling_booking', NEW.id, 'Handling Booking Baru', 'Handling booking baru telah dibuat', 'ALL');
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS handling_booking_notification_trigger ON handling_bookings;
CREATE TRIGGER handling_booking_notification_trigger
  AFTER INSERT ON handling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_handling_booking_notification();
