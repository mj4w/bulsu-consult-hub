alter table public.instructor_availability
  drop constraint if exists instructor_availability_meeting_platform_check;

update public.instructor_availability
set meeting_platform = 'google_meet'
where meeting_platform = 'microsoft_teams';

alter table public.instructor_availability
  add constraint instructor_availability_meeting_platform_check
  check (meeting_platform in ('none', 'google_meet', 'zoom', 'other'));

comment on column public.instructor_availability.meeting_platform is
  'Online meeting provider selected by the instructor. Supported values: none, google_meet, zoom, other.';
