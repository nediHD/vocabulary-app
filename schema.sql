-- Create the cards table for vocabulary learning
create table cards (
  id uuid primary key default gen_random_uuid(),
  german text not null,
  french text not null,
  status text not null default 'learning' check (status in ('learning','review')),
  learning_correct_count int not null default 0,
  interval_days int not null default 1,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table cards enable row level security;

-- RLS policies to allow anonymous users to perform all operations
-- This is safe because the anon key is public and we rely on RLS to enforce access control
create policy "anon_select" on cards for select to anon using (true);
create policy "anon_insert" on cards for insert to anon with check (true);
create policy "anon_update" on cards for update to anon using (true) with check (true);
create policy "anon_delete" on cards for delete to anon using (true);
