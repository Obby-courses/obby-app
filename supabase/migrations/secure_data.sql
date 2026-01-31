-- Ensure 'courses' table has a 'user_id' column if it doesn't already
do $$
begin
  if not exists (select from pg_attribute where attrelid = 'public.courses'::regclass and attname = 'user_id') then
    alter table public.courses add column user_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- Enable RLS on all related tables
alter table public.courses enable row level security;
alter table public.macro_phases enable row level security;
alter table public.phases enable row level security;
alter table public.steps enable row level security;
alter table public.resources enable row level security;

-- DROP existing policies to avoid conflicts
drop policy if exists "Users can see their own courses and public courses." on courses;
drop policy if exists "Users can see their own courses." on courses;
drop policy if exists "Users can insert their own courses." on courses;
drop policy if exists "Users can update their own courses." on courses;
drop policy if exists "Users can delete their own courses." on courses;
drop policy if exists "Access phases if course is accessible." on macro_phases;
drop policy if exists "Access sub-phases if course is accessible." on phases;
drop policy if exists "Access steps if phase is accessible." on steps;
drop policy if exists "Access resources if linked to an accessible step." on resources;
drop policy if exists "Access resources if step is accessible." on resources;

-- Policies for Courses
create policy "Users can see their own courses."
  on courses for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own courses."
  on courses for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own courses."
  on courses for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own courses."
  on courses for delete
  using ( auth.uid() = user_id );

-- Policies for children (cascading access)
create policy "Access phases if course is accessible."
  on macro_phases for all
  using ( exists (select 1 from courses where id = macro_phases.course_id) );

create policy "Access sub-phases if course is accessible."
  on phases for all
  using ( exists (select 1 from macro_phases mp join courses c on mp.course_id = c.id where mp.id = phases.macro_phase_id) );

create policy "Access steps if phase is accessible."
  on steps for all
  using ( exists (select 1 from phases p join macro_phases mp on p.macro_phase_id = mp.id join courses c on mp.course_id = c.id where p.id = steps.phase_id) );

create policy "Access resources if linked to an accessible step."
  on resources for all
  using ( exists (select 1 from steps s join phases p on s.phase_id = p.id join macro_phases mp on p.macro_phase_id = mp.id join courses c on mp.course_id = c.id where s.resource_id = resources.id) );


