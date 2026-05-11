-- Removes only the old bundled example trainings from an existing database.
-- Use this if your PostgreSQL database already contains the examples.

update training_courses
set courses = (
  select coalesce(jsonb_agg(course), '[]'::jsonb)
  from jsonb_array_elements(courses) as course
  where course->>'id' not in (
    'rpu',
    'ambulance-clinical-response',
    'fire-incident-command',
    'sar-search-planning',
    'highways-traffic-management',
    'ntp-rail-response'
  )
),
updated_at = now()
where id = 1;
