do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'instructor_availability'
  ) then
    alter publication supabase_realtime add table public.instructor_availability;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'availability_programs'
  ) then
    alter publication supabase_realtime add table public.availability_programs;
  end if;
end $$;
