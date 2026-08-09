create or replace view public.student_occupied_consultation_slots as
select
  request.id,
  request.availability_id,
  request.instructor_id,
  request.requested_start_datetime,
  request.requested_end_datetime
from public.consultation_requests request
where request.status = 'approved';

grant select on public.student_occupied_consultation_slots to authenticated;

comment on view public.student_occupied_consultation_slots is
  'Anonymous approved consultation time blocks. Used by students to see which portions of an instructor availability window are already occupied.';
