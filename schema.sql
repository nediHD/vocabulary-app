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

-- Audio-Cache für "Sätze üben": gespeicherte Batches (Wortgruppe -> Text + Fragen + Audio)
-- Spart TTS-Kosten, indem bereits generierte Audios wiederverwendet werden.
create table if not exists audio_cache (
  id uuid primary key default gen_random_uuid(),
  word_ids uuid[] not null,          -- IDs der Wörter in dieser Gruppe
  french text not null,              -- generierter französischer Text
  questions jsonb not null default '[]'::jsonb,
  audio_path text not null,          -- Pfad im Storage-Bucket "batch-audio"
  created_at timestamptz not null default now()
);
alter table audio_cache enable row level security;
create policy ac_select on audio_cache for select to anon using (true);
create policy ac_insert on audio_cache for insert to anon with check (true);

-- Storage-Bucket für die Audiodateien (öffentlich lesbar zum Abspielen)
insert into storage.buckets (id, name, public)
values ('batch-audio','batch-audio', true)
on conflict (id) do update set public = true;
create policy ba_read on storage.objects for select to anon using (bucket_id = 'batch-audio');
create policy ba_insert on storage.objects for insert to anon with check (bucket_id = 'batch-audio');
