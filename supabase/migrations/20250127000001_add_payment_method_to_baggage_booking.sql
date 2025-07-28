-- Add payment_method column to baggage_booking table if it doesn't exist
ALTER TABLE baggage_booking ADD COLUMN IF NOT EXISTS payment_method TEXT;
