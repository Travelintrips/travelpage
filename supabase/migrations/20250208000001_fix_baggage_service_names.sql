-- Fix existing baggage service names in shopping_cart table
UPDATE shopping_cart 
SET service_name = CASE 
  WHEN item_id = 'electronic' THEN 'Baggage Storage – Electronic'
  WHEN item_id = 'small' THEN 'Baggage Storage – Small'
  WHEN item_id = 'medium' THEN 'Baggage Storage – Medium'
  WHEN item_id = 'large' THEN 'Baggage Storage – Large'
  WHEN item_id = 'extra_large' THEN 'Baggage Storage – Extra Large'
  WHEN item_id = 'surfingboard' THEN 'Baggage Storage – Surfing Board'
  WHEN item_id = 'wheelchair' THEN 'Baggage Storage – Wheel Chair'
  WHEN item_id = 'stickgolf' THEN 'Baggage Storage – Stick Golf'
  ELSE service_name
END
WHERE item_type = 'baggage' 
  AND (service_name LIKE '%Unknown%' OR service_name IS NULL);