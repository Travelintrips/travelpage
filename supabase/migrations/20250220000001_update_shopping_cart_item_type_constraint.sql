-- Update shopping_cart item_type constraint to include 'domestik_kargo' and 'handling'
ALTER TABLE shopping_cart
  DROP CONSTRAINT IF EXISTS shopping_cart_item_type_check;

ALTER TABLE shopping_cart
  ADD CONSTRAINT shopping_cart_item_type_check
  CHECK (item_type IN ('baggage', 'airport_transfer', 'car', 'domestik_kargo', 'handling'));
