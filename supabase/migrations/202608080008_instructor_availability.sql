create table if not exists public.instructor_availability (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  instructor_display_name text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  consultation_mode text not null default 'both' check (consultation_mode in ('f2f', 'online', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint availability_time_order check (end_datetime > start_datetime)
);

create table if not exists public.availability_programs (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.instructor_availability(id) on delete cascade,
  program text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (availability_id, program)
);

create index if not exists instructor_availability_instructor_idx on public.instructor_availability (instructor_id, start_datetime);
create index if not exists availability_programs_program_idx on public.availability_programs (program);

alter table public.instructor_availability enable row level security;
alter table public.availability_programs enable row level security;

drop policy if exists "Authenticated users can view active availability" on public.instructor_availability;
create policy "Authenticated users can view active availability" on public.instructor_availability for select to authenticated using (is_active or auth.uid() = instructor_id);

drop policy if exists "Instructors can create their availability" on public.instructor_availability;
create policy "Instructors can create their availability" on public.instructor_availability for insert to authenticated with check (auth.uid() = instructor_id and exists (select 1 from public.profiles where id = auth.uid() and role = 'instructor'));

drop policy if exists "Instructors can update their availability" on public.instructor_availability;
create policy "Instructors can update their availability" on public.instructor_availability for update to authenticated using (auth.uid() = instructor_id) with check (auth.uid() = instructor_id);

drop policy if exists "Instructors can delete their availability" on public.instructor_availability;
create policy "Instructors can delete their availability" on public.instructor_availability for delete to authenticated using (auth.uid() = instructor_id);

drop policy if exists "Authenticated users can view availability programs" on public.availability_programs;
create policy "Authenticated users can view availability programs" on public.availability_programs for select to authenticated using (exists (select 1 from public.instructor_availability a where a.id = availability_id and (a.is_active or a.instructor_id = auth.uid())));

drop policy if exists "Instructors can manage availability programs" on public.availability_programs;
create policy "Instructors can manage availability programs" on public.availability_programs for all to authenticated using (exists (select 1 from public.instructor_availability a where a.id = availability_id and a.instructor_id = auth.uid())) with check (exists (select 1 from public.instructor_availability a where a.id = availability_id and a.instructor_id = auth.uid()));

drop trigger if exists instructor_availability_updated_at on public.instructor_availability;
create trigger instructor_availability_updated_at before update on public.instructor_availability for each row execute procedure public.set_updated_at();

grant select, insert, update, delete on public.instructor_availability to authenticated;
grant select, insert, update, delete on public.availability_programs to authenticated;
