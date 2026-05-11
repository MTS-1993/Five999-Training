-- Five999 Training Dashboard PostgreSQL schema
-- Import this first.

create table if not exists training_progress (
  discord_id text primary key,
  username text not null,
  avatar text,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists training_courses (
  id integer primary key default 1,
  courses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists training_progress_updated_at_idx
  on training_progress (updated_at desc);
