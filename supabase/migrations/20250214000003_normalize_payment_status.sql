-- Update all payment statuses that are not 'paid' to 'unpaid'
UPDATE bookings
SET payment_status = 'unpaid'
WHERE payment_status != 'paid' 
  AND payment_status IS NOT NULL;

-- Also handle NULL payment statuses
UPDATE bookings
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;
