-- Add KK and STNK URL fields to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS kk_url TEXT,
ADD COLUMN IF NOT EXISTS stnk_url TEXT;
