-- Five999 Training Dashboard empty training seed
-- Import this after schema.sql if you want to clear all existing trainings.

insert into training_courses (id, courses, updated_at)
values (1, '[]'::jsonb, now())
on conflict (id) do update set
  courses = '[]'::jsonb,
  updated_at = now();
