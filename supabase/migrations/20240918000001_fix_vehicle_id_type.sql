-- Fix the vehicle_id type in bookings table

-- First check if the bookings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    -- Check if vehicle_id column exists and is of type UUID
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'vehicle_id' 
      AND data_type = 'uuid'
    ) THEN
      -- Create a temporary column
      ALTER TABLE bookings ADD COLUMN vehicle_id_int INTEGER;
      
      -- Update the temporary column with NULL values (since we can't convert UUID to INT)
      UPDATE bookings SET vehicle_id_int = NULL;
      
      -- Drop the old column
      ALTER TABLE bookings DROP COLUMN vehicle_id;
      
      -- Rename the temporary column
      ALTER TABLE bookings RENAME COLUMN vehicle_id_int TO vehicle_id;
      
      -- Add foreign key constraint if vehicles table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_vehicle_id_fkey
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
      END IF;
    END IF;
  END IF;
END
$$;