CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
  shipping_cost DECIMAL(15,2) DEFAULT 0 CHECK (shipping_cost >= 0),
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price + shipping_cost) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION approve_purchase_request(request_id UUID, approver_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE purchase_requests 
  SET 
    status = 'approved',
    approved_by = approver_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = request_id AND status = 'pending';
  
  IF FOUND THEN
    result := json_build_object('success', true, 'message', 'Purchase request approved successfully');
  ELSE
    result := json_build_object('success', false, 'message', 'Purchase request not found or already processed');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_purchase_request(request_id UUID, approver_id UUID, reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE purchase_requests 
  SET 
    status = 'rejected',
    approved_by = approver_id,
    approved_at = NOW(),
    rejection_reason = reason,
    updated_at = NOW()
  WHERE id = request_id AND status = 'pending';
  
  IF FOUND THEN
    result := json_build_object('success', true, 'message', 'Purchase request rejected successfully');
  ELSE
    result := json_build_object('success', false, 'message', 'Purchase request not found or already processed');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all purchase requests" ON purchase_requests;
CREATE POLICY "Users can view all purchase requests"
ON purchase_requests FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create purchase requests" ON purchase_requests;
CREATE POLICY "Users can create purchase requests"
ON purchase_requests FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update purchase requests" ON purchase_requests;
CREATE POLICY "Admins can update purchase requests"
ON purchase_requests FOR UPDATE
USING (true);