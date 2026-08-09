alter table public.consultation_requests
  add column if not exists decision_note text;

create unique index if not exists consultation_requests_one_approved_exact_time
  on public.consultation_requests (
    instructor_id,
    requested_start_datetime,
    requested_end_datetime
  )
  where status = 'approved';

comment on column public.consultation_requests.decision_note is
  'Instructor-facing decision note shown to the student when a request is approved, declined, or auto-declined.';
