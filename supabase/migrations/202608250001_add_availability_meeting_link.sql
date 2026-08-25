alter table public.instructor_availability
  add column if not exists meeting_platform text
    default 'none'
    check (meeting_platform in ('none', 'microsoft_teams', 'zoom', 'other')),
  add column if not exists meeting_url text;

update public.instructor_availability
set meeting_platform = 'none'
where meeting_platform is null;

comment on column public.instructor_availability.meeting_platform is
  'Optional online meeting provider for online or hybrid consultation windows.';

comment on column public.instructor_availability.meeting_url is
  'Instructor-provided online meeting URL. Shown to students after approval.';
