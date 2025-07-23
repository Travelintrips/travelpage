INSERT INTO payment_methods (name, type, bank_name, account_number, account_holder, swift_code, branch, is_active) VALUES
('BCA Transfer', 'manual', 'Bank Central Asia', '1234567890', 'PT Airport Services', 'CENAIDJA', 'Jakarta Pusat', true),
('BNI Transfer', 'manual', 'Bank Negara Indonesia', '0987654321', 'PT Airport Services', 'BNINIDJA', 'Jakarta Pusat', true),
('Mandiri Transfer', 'manual', 'Bank Mandiri', '1357924680', 'PT Airport Services', 'BMRIIDJA', 'Jakarta Pusat', true),
('BRI Transfer', 'manual', 'Bank Rakyat Indonesia', '2468013579', 'PT Airport Services', 'BRINIDJA', 'Jakarta Pusat', true)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  bank_name = EXCLUDED.bank_name,
  account_number = EXCLUDED.account_number,
  account_holder = EXCLUDED.account_holder,
  swift_code = EXCLUDED.swift_code,
  branch = EXCLUDED.branch,
  is_active = EXCLUDED.is_active;