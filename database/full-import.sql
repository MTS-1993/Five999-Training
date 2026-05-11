-- Five999 Training Dashboard PostgreSQL full import
-- This creates the required tables and starts with no example trainings.

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

insert into training_courses (id, courses, updated_at)
values (1, '[]'::jsonb, now())
on conflict (id) do update set
  courses = '[]'::jsonb,
  updated_at = now();
