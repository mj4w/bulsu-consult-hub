create or replace function public.enforce_student_consultation_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role
  into actor_role
  from public.profiles
  where id = auth.uid();

  if actor_role <> 'student' or auth.uid() <> old.student_id then
    return new;
  end if;

  if new.student_id <> old.student_id
    or new.instructor_id <> old.instructor_id
    or new.availability_id <> old.availability_id
    or new.requested_start_datetime <> old.requested_start_datetime
    or new.requested_end_datetime <> old.requested_end_datetime then
    raise exception 'Students cannot modify request ownership or schedule.';
  end if;

  if old.status = 'pending' then
    if new.status not in ('pending', 'cancelled') then
      raise exception 'Pending requests can only be edited or cancelled by students.';
    end if;

    if new.status = 'pending'
      and new.decision_note is distinct from old.decision_note then
      raise exception 'Students cannot modify instructor notes.';
    end if;

    return new;
  end if;

  if old.status = 'approved' then
    if new.status <> 'cancelled' then
      raise exception 'Approved requests can only be cancelled by students.';
    end if;

    if old.requested_start_datetime <= now() + interval '24 hours' then
      raise exception 'Approved consultations can only be cancelled more than 24 hours before they start.';
    end if;

    if new.concern_type <> old.concern_type
      or new.message <> old.message then
      raise exception 'Approved consultation details cannot be edited by students.';
    end if;

    return new;
  end if;

  raise exception 'This request can no longer be changed by the student.';
end;
$$;

drop trigger if exists enforce_student_consultation_request_update
  on public.consultation_requests;

create trigger enforce_student_consultation_request_update
  before update on public.consultation_requests
  for each row execute function public.enforce_student_consultation_request_update();

drop policy if exists "Students can update their own consultation requests"
  on public.consultation_requests;

create policy "Students can update their own consultation requests"
  on public.consultation_requests for update to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
