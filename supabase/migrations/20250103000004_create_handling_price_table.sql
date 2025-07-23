CREATE TABLE IF NOT EXISTS handling_price (
  id SERIAL PRIMARY KEY,
  terminal_1a DECIMAL(10,2) DEFAULT 0,
  terminal_1b DECIMAL(10,2) DEFAULT 0,
  terminal_2d DECIMAL(10,2) DEFAULT 0,
  terminal_2e DECIMAL(10,2) DEFAULT 0,
  terminal_3_domestik DECIMAL(10,2) DEFAULT 0,
  terminal_3_international DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO handling_price (terminal_1a, terminal_1b, terminal_2d, terminal_2e, terminal_3_domestik, terminal_3_international) 
VALUES (100000, 100000, 100000, 100000, 100000, 100000);

alter publication supabase_realtime add table handling_price;