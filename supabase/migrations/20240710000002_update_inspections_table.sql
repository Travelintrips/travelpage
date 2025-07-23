-- Add fee_breakdown and total_fees columns to inspections table
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS fee_breakdown JSONB;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS total_fees NUMERIC DEFAULT 0;

-- Add the table to realtime publication
ALTER publication supabase_realtime ADD TABLE inspections;