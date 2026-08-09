alter table public.consultation_requests
  drop constraint if exists consultation_requests_availability_id_fkey;

alter table public.consultation_requests
  add constraint consultation_requests_availability_id_fkey
  foreign key (availability_id)
  references public.instructor_availability(id)
  on delete restrict;
