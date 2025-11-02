DROP POLICY IF EXISTS "Allow drivers and admins to insert bookings" ON bookings;

CREATE POLICY "Allow drivers and admins to insert bookings"
ON bookings FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    auth.uid() = driver_id
    OR (auth.jwt() ->> 'role') IN ('Admin', 'Super Admin', 'Staff')
  )
);