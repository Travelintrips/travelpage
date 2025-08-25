-- Membuat tabel memberships
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references users(id) on delete cascade,
  is_active boolean not null default false,
  start_date date,
  end_date date,
  discount_percentage numeric(5,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  status text not null default 'inactive',
  activated_by uuid references users(id),
  activated_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index biar query lebih cepat
create index if not exists idx_memberships_agent_id on memberships(agent_id);
create index if not exists idx_memberships_is_active on memberships(is_active);
create index if not exists idx_memberships_status on memberships(status);

-- Enable RLS
alter table memberships enable row level security;

-- Create policies
create policy "Admin can view all memberships" on memberships
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('Admin', 'Super Admin', 'Staff Admin')
    )
  );

create policy "Admin can insert memberships" on memberships
  for insert with check (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('Admin', 'Super Admin', 'Staff Admin')
    )
  );

create policy "Admin can update memberships" on memberships
  for update using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('Admin', 'Super Admin', 'Staff Admin')
    )
  );

-- Add unique constraint for agent_id
alter table memberships add constraint unique_agent_membership unique (agent_id);

-- Add realtime
alter publication supabase_realtime add table memberships;
