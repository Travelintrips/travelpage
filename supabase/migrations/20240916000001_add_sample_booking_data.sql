-- Add sample booking data if the bookings table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings LIMIT 1) THEN
    -- Insert sample vehicles if needed
    INSERT INTO vehicles (make, model, license_plate, is_available, status, type, year, color)
    VALUES 
      ('Toyota', 'Avanza', 'B1234CD', true, 'available', 'MPV', 2022, 'Silver'),
      ('Honda', 'Civic', 'B5678EF', true, 'available', 'Sedan', 2023, 'Black'),
      ('Suzuki', 'Ertiga', 'B9012GH', true, 'available', 'MPV', 2021, 'White')
    ON CONFLICT (license_plate) DO NOTHING;
    
    -- Insert sample users if needed
    INSERT INTO users (id, email, full_name, phone)
    VALUES 
      ('user1', 'customer1@example.com', 'John Doe', '+6281234567890'),
      ('user2', 'customer2@example.com', 'Jane Smith', '+6281234567891'),
      ('user3', 'customer3@example.com', 'Robert Johnson', '+6281234567892')
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert sample bookings
    INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, status, payment_status, total_amount, created_at)
    VALUES
      ('user1', (SELECT id FROM vehicles WHERE license_plate = 'B1234CD' LIMIT 1), 
       CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'confirmed', 'paid', 1500000, CURRENT_TIMESTAMP),
      ('user2', (SELECT id FROM vehicles WHERE license_plate = 'B5678EF' LIMIT 1), 
       CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'onride', 'partial', 1200000, CURRENT_TIMESTAMP - INTERVAL '1 day'),
      ('user3', (SELECT id FROM vehicles WHERE license_plate = 'B9012GH' LIMIT 1), 
       CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 'confirmed', 'unpaid', 1800000, CURRENT_TIMESTAMP - INTERVAL '2 hours');
  END IF;
END;
$$;