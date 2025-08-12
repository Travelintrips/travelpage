-- Create topup_requests table
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT NOT NULL,
  bank_name TEXT,
  sender_name TEXT NOT NULL,
  sender_account TEXT NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created_at ON topup_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_topup_requests_verified_by ON topup_requests(verified_by);

-- Enable realtime (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'topup_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE topup_requests;
    END IF;
END $$;

-- VERIFIKASI RPC Function
CREATE OR REPLACE FUNCTION public.verify_topup(p_request_id uuid, p_admin uuid, p_note text default null)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM topup_requests WHERE id=p_request_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;

  UPDATE topup_requests
     SET status='verified',
         verified_at=now(),
         verified_by=p_admin,
         note = coalesce(p_note, note)
   WHERE id=p_request_id;
END $$;

-- REJECT RPC Function
CREATE OR REPLACE FUNCTION public.reject_topup(p_request_id uuid, p_admin uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM topup_requests WHERE id=p_request_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Topup request not pending';
  END IF;

  UPDATE topup_requests
     SET status='rejected',
         verified_at=now(),
         verified_by=p_admin,
         note = coalesce(p_reason, note)
   WHERE id=p_request_id;
END $$;