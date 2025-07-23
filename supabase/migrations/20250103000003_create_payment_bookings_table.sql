create table if not exists payment_bookings (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id) on delete cascade,
  booking_id uuid not null,
  booking_type text check (booking_type in ('baggage', 'airport_transfer', 'driver', 'car', 'handling')),
  created_at timestamp default now()
);

alter publication supabase_realtime add table payment_bookings;
