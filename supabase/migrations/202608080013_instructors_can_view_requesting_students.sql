drop policy if exists "Instructors can view profiles of requesting students" on public.profiles;
create policy "Instructors can view profiles of requesting students"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.consultation_requests request
      where request.student_id = profiles.id
        and request.instructor_id = auth.uid()
    )
  );
