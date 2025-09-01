-- Add admin_name column to histori_transaksi table
ALTER TABLE histori_transaksi ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- Create index for better performance when filtering by admin_name
CREATE INDEX IF NOT EXISTS idx_histori_transaksi_admin_name ON histori_transaksi(admin_name);

-- Enable realtime for histori_transaksi table if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'histori_transaksi'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE histori_transaksi;
    END IF;
END $$;
