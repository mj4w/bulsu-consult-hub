create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.instructor_availability(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  requested_start_datetime timestamptz not null,
  requested_end_datetime timestamptz not null,
  concern_type text not null check (concern_type in ('research', 'grades', 'projects', 'others')),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultation_requests_valid_time check (requested_end_datetime > requested_start_datetime),
  constraint consultation_requests_one_per_exact_time unique (availability_id, student_id, requested_start_datetime, requested_end_datetime)
);

create index if not exists consultation_requests_student_idx
  on public.consultation_requests (student_id, created_at desc);

create index if not exists consultation_requests_instructor_idx
  on public.consultation_requests (instructor_id, created_at desc);

create index if not exists consultation_requests_requested_time_idx
  on public.consultation_requests (instructor_id, requested_start_datetime, requested_end_datetime);

alter table public.consultation_requests enable row level security;

drop policy if exists "Students can create their own consultation requests" on public.consultation_requests;
create policy "Students can create their own consultation requests"
  on public.consultation_requests for insert to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'student'
    )
    and exists (
      select 1
      from public.instructor_availability availability
      where availability.id = availability_id
        and availability.instructor_id = consultation_requests.instructor_id
        and availability.is_active
        and consultation_requests.requested_start_datetime >= availability.start_datetime
        and consultation_requests.requested_end_datetime <= availability.end_datetime
    )
  );

drop policy if exists "Students can view their own consultation requests" on public.consultation_requests;
create policy "Students can view their own consultation requests"
  on public.consultation_requests for select to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Instructors can view requests sent to them" on public.consultation_requests;
create policy "Instructors can view requests sent to them"
  on public.consultation_requests for select to authenticated
  using (auth.uid() = instructor_id);

drop policy if exists "Instructors can respond to requests sent to them" on public.consultation_requests;
create policy "Instructors can respond to requests sent to them"
  on public.consultation_requests for update to authenticated
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

drop policy if exists "Authenticated users can view instructor profile names" on public.profiles;
create policy "Authenticated users can view instructor profile names"
  on public.profiles for select to authenticated
  using (role = 'instructor');

drop trigger if exists consultation_requests_updated_at on public.consultation_requests;
create trigger consultation_requests_updated_at
  before update on public.consultation_requests
  for each row execute procedure public.set_updated_at();

grant select, insert, update on public.consultation_requests to authenticated;
