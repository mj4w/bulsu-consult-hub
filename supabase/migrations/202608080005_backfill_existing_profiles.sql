-- Create profile rows for Microsoft users who existed before the profile trigger.
-- Run this after migrations 001 through 004 in Supabase SQL Editor.

insert into public.profiles (id, email, full_name, role)
select
  au.id,
  lower(au.email),
  coalesce(
    nullif(au.raw_user_meta_data ->> 'full_name', ''),
    nullif(au.raw_user_meta_data ->> 'name', ''),
    nullif(au.raw_user_meta_data ->> 'display_name', '')
  ),
  public.infer_profile_role(au.email)
from auth.users as au
where au.email is not null
  and au.email ~* '^[^@\s]+@ms\.bulsu\.edu\.ph$'
on conflict (id) do nothing;
