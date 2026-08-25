-- Repair one missing profile row for the currently signed-in user.
-- Run this only in Supabase SQL Editor while authenticated as the affected user,
-- or replace auth.uid() with the specific auth.users.id if running as an admin.

insert into public.profiles (
  id,
  email,
  full_name,
  role,
  is_test_account
)
select
  user_record.id,
  lower(user_record.email),
  coalesce(
    nullif(user_record.raw_user_meta_data ->> 'full_name', ''),
    nullif(user_record.raw_user_meta_data ->> 'name', ''),
    nullif(user_record.raw_user_meta_data ->> 'display_name', '')
  ),
  case
    when user_record.email ~* '^[0-9]+@'
      then 'student'::public.user_role
    else 'instructor'::public.user_role
  end,
  false
from auth.users as user_record
where user_record.id = auth.uid()
on conflict (id) do nothing;

