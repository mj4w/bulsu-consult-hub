-- Repair student duplicate request rule.
--
-- Correct behavior:
-- - A student cannot send the same exact request twice while the old request is pending or approved.
-- - A student can request the same exact time again if the previous request was declined or cancelled.
-- - Different time slots inside the same instructor window are allowed.

alter table public.consultation_requests
  drop constraint if exists consultation_requests_one_per_exact_time;

drop index if exists public.consultation_requests_one_per_exact_time;
drop index if exists public.consultation_requests_one_active_exact_time;
drop index if exists public.consultation_requests_student_active_exact_time;
drop index if exists public.consultation_requests_one_per_window;
drop index if exists public.consultation_requests_one_per_availability;
drop index if exists public.consultation_requests_availability_student_key;
drop index if exists public.consultation_requests_unique_student_availability;

-- Drop any old UNIQUE CONSTRAINT that only uses:
--   (availability_id, student_id)
-- because that incorrectly allows only one request per whole instructor window.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'consultation_requests'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by keys.ordinality)
        from unnest(con.conkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = con.conrelid
         and att.attnum = keys.attnum
      ) = array['availability_id', 'student_id']::name[]
  loop
    execute format(
      'alter table public.consultation_requests drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

-- Drop any old standalone UNIQUE INDEX that only uses:
--   (availability_id, student_id)
do $$
declare
  index_record record;
begin
  for index_record in
    select
      idx.indexrelid::regclass as index_name
    from pg_index idx
    join pg_class tbl on tbl.oid = idx.indrelid
    join pg_namespace nsp on nsp.oid = tbl.relnamespace
    where nsp.nspname = 'public'
      and tbl.relname = 'consultation_requests'
      and idx.indisunique
      and not exists (
        select 1
        from pg_constraint con
        where con.conindid = idx.indexrelid
      )
      and (
        select array_agg(att.attname order by keys.ordinality)
        from unnest(idx.indkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = idx.indrelid
         and att.attnum = keys.attnum
      ) = array['availability_id', 'student_id']::name[]
  loop
    execute format('drop index if exists %s', index_record.index_name);
  end loop;
end $$;

create unique index if not exists consultation_requests_student_active_exact_time
  on public.consultation_requests (
    availability_id,
    student_id,
    requested_start_datetime,
    requested_end_datetime
  )
  where status in ('pending', 'approved');
