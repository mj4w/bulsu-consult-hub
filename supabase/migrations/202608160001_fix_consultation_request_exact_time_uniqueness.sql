-- Repair consultation request uniqueness.
--
-- Correct behavior:
-- A student may send more than one request inside the same instructor
-- availability window as long as the requested start/end time is different.
--
-- This removes older broad uniqueness rules such as:
--   unique (availability_id, student_id)
-- and keeps/enforces:
--   unique (availability_id, student_id, requested_start_datetime, requested_end_datetime)

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'consultation_requests'
      and constraint_type = 'UNIQUE'
      and constraint_name in (
        select tc.constraint_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_schema = kcu.constraint_schema
         and tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
         and tc.table_name = kcu.table_name
        where tc.table_schema = 'public'
          and tc.table_name = 'consultation_requests'
          and tc.constraint_type = 'UNIQUE'
        group by tc.constraint_name
        having array_agg(kcu.column_name::text order by kcu.ordinal_position)
          = array['availability_id', 'student_id']::text[]
      )
  loop
    execute format(
      'alter table public.consultation_requests drop constraint if exists %I',
      constraint_record.constraint_name
    );
  end loop;
end $$;

drop index if exists public.consultation_requests_one_per_window;
drop index if exists public.consultation_requests_one_per_availability;
drop index if exists public.consultation_requests_availability_student_key;
drop index if exists public.consultation_requests_unique_student_availability;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'consultation_requests'
      and constraint_name = 'consultation_requests_one_per_exact_time'
  ) then
    alter table public.consultation_requests
      add constraint consultation_requests_one_per_exact_time
      unique (
        availability_id,
        student_id,
        requested_start_datetime,
        requested_end_datetime
      );
  end if;
end $$;
