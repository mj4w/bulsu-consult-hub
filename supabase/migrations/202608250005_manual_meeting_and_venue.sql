alter table public.instructor_availability
  add column if not exists venue text;

update public.instructor_availability
set meeting_platform = 'other'
where meeting_platform in ('google_meet', 'zoom', 'microsoft_teams');

alter table public.instructor_availability
  drop constraint if exists instructor_availability_meeting_platform_check;

alter table public.instructor_availability
  add constraint instructor_availability_meeting_platform_check
  check (meeting_platform in ('none', 'other'));

comment on column public.instructor_availability.meeting_platform is
  'Online meeting option for consultation windows. Supported values: none or other. Online links are manually provided by instructors.';

comment on column public.instructor_availability.meeting_url is
  'Instructor-provided online meeting URL. Shown to students after approval.';

comment on column public.instructor_availability.venue is
  'Instructor-provided physical consultation location for F2F or hybrid windows.';
