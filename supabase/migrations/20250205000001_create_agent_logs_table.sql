create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references users(id) on delete cascade,
  activated_by uuid references users(id),
  action text not null,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table agent_logs;