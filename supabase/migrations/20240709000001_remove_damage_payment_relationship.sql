-- Remove damage_id and is_damage_payment columns from payments table
ALTER TABLE payments DROP COLUMN IF EXISTS damage_id;
ALTER TABLE payments DROP COLUMN IF EXISTS is_damage_payment;

-- Add the table to realtime publication
alter publication supabase_realtime add table payments;