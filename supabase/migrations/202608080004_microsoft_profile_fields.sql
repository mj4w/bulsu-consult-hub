-- Profile fields imported from Microsoft Graph when available.

alter table public.profiles
  add column if not exists department text,
  add column if not exists job_title text,
  add column if not exists office_location text;
