ALTER TABLE purchase_requests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS completion_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_requests_completed_at ON purchase_requests(completed_at);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_completed_by ON purchase_requests(completed_by);