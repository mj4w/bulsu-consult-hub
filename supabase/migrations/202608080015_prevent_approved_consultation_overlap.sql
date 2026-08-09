create or replace function public.prevent_approved_consultation_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('pending', 'approved') and exists (
    select 1
    from public.consultation_requests existing
    where existing.instructor_id = new.instructor_id
      and existing.status = 'approved'
      and existing.id <> new.id
      and existing.requested_start_datetime < new.requested_end_datetime
      and existing.requested_end_datetime > new.requested_start_datetime
  ) then
    raise exception 'This time is already occupied by an approved consultation.';
  end if;

  return new;
end;
$$;

drop trigger if exists consultation_requests_prevent_approved_overlap on public.consultation_requests;
create trigger consultation_requests_prevent_approved_overlap
  before insert or update on public.consultation_requests
  for each row execute procedure public.prevent_approved_consultation_overlap();
