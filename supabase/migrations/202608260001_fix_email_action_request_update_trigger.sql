create or replace function public.enforce_student_consultation_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  -- Server-side routes that use the service role do not have an auth.uid().
  -- They are allowed to update request status for trusted workflows such as
  -- instructor email approve/decline action links.
  if auth.uid() is null then
    return new;
  end if;

  select role
  into actor_role
  from public.profiles
  where id = auth.uid();

  -- Only student-owned updates are restricted by this trigger.
  -- Instructor updates are handled by RLS/policies and server actions.
  if actor_role is distinct from 'student'
    or auth.uid() is distinct from old.student_id then
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
    if new.status = 'approved'
      and new.concern_type = old.concern_type
      and new.message = old.message
      and new.decision_note is not distinct from old.decision_note
      and (
        new.microsoft_calendar_event_id is distinct from old.microsoft_calendar_event_id
        or new.microsoft_calendar_synced_at is distinct from old.microsoft_calendar_synced_at
      ) then
      return new;
    end if;

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
