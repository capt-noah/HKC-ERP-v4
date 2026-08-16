-- Schema for bin_cards resource table in Supabase / SQLite backend
create table if not exists public.bin_cards (
  id text primary key,
  payload jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_bin_cards_payload on public.bin_cards using gin (payload);
