alter table public.instructor_availability
  drop constraint if exists instructor_availability_meeting_platform_check;

update public.instructor_availability
set meeting_platform = 'microsoft_teams'
where meeting_platform = 'google_meet';

alter table public.instructor_availability
  add constraint instructor_availability_meeting_platform_check
  check (meeting_platform in ('none', 'microsoft_teams', 'zoom', 'other'));
