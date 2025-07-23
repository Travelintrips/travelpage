-- Create vehicle-inspections bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-inspections', 'vehicle-inspections', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
  
  EXCEPTION WHEN OTHERS THEN
    -- If there's an error, it might be because the storage schema doesn't exist yet
    -- Just log the error and continue
    RAISE NOTICE 'Error creating bucket: %', SQLERRM;
END
$$;

-- Create policy to allow authenticated users to upload to vehicle-inspections bucket
-- First check if the bucket exists to avoid errors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vehicle-inspections') THEN
    -- Drop the policy if it exists
    BEGIN
      DROP POLICY IF EXISTS "Allow authenticated users to upload to vehicle-inspections bucket" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping policy: %', SQLERRM;
    END;
    
    -- Create the policy
    BEGIN
      CREATE POLICY "Allow authenticated users to upload to vehicle-inspections bucket"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'vehicle-inspections')
      WITH CHECK (bucket_id = 'vehicle-inspections');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating policy: %', SQLERRM;
    END;
  END IF;
END
$$;
