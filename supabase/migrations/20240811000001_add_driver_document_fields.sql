-- Add missing document fields to drivers table if they don't exist
DO $$
BEGIN
    -- Check if kk_url column exists in drivers table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'kk_url') THEN
        ALTER TABLE public.drivers ADD COLUMN kk_url TEXT;
    END IF;

    -- Check if stnk_url column exists in drivers table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'stnk_url') THEN
        ALTER TABLE public.drivers ADD COLUMN stnk_url TEXT;
    END IF;

    -- Check if skck_url column exists in drivers table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'skck_url') THEN
        ALTER TABLE public.drivers ADD COLUMN skck_url TEXT;
    END IF;
END
$$;

-- Add the drivers table to realtime publication if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'drivers') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
        END IF;
    END IF;
END
$$;
