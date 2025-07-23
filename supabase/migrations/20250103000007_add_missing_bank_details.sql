-- Add swift_code column if it doesn't exist
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS swift_code TEXT;

-- Add missing bank details to existing payment methods
UPDATE payment_methods 
SET 
  account_holder = CASE 
    WHEN name = 'Mandiri' THEN 'PT Travel Indonesia'
    WHEN name = 'BCA' THEN 'PT Travel Indonesia'
    ELSE account_holder
  END,
  account_number = CASE 
    WHEN name = 'Mandiri' THEN '1234567890'
    WHEN name = 'BCA' THEN '0987654321'
    ELSE account_number
  END,
  bank_code = CASE 
    WHEN name = 'Mandiri' THEN 'BMRIIDJA'
    WHEN name = 'BCA' THEN 'CENAIDJA'
    ELSE bank_code
  END,
  branch = CASE 
    WHEN name = 'Mandiri' THEN 'Jakarta Pusat'
    WHEN name = 'BCA' THEN 'Jakarta Pusat'
    ELSE branch
  END,
  bank_name = CASE 
    WHEN name = 'Mandiri' THEN 'Bank Mandiri'
    WHEN name = 'BCA' THEN 'Bank Central Asia'
    ELSE bank_name
  END,
  swift_code = CASE 
    WHEN name = 'Mandiri' THEN 'BMRIIDJA'
    WHEN name = 'BCA' THEN 'CENAIDJA'
    ELSE swift_code
  END
WHERE type = 'manual' AND name IN ('Mandiri', 'BCA');
