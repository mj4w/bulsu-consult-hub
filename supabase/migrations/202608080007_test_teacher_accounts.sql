-- Development-only native teacher accounts for /teacher-portal.
-- These accounts are explicitly marked as test accounts and do not change
-- the Microsoft-only rule for normal users.

alter table public.profiles
  add column if not exists is_test_account boolean not null default false;

alter table public.profiles drop constraint if exists profiles_bulsu_email;
alter table public.profiles add constraint profiles_bulsu_email
  check (
    is_test_account
    or email ~* '^[^@[:space:]]+@ms[.]bulsu[.]edu[.]ph$'
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_test_teacher boolean := coalesce((new.raw_user_meta_data ->> 'test_teacher')::boolean, false);
begin
  if not is_test_teacher and (new.email is null or new.email !~* '^[^@[:space:]]+@ms[.]bulsu[.]edu[.]ph$') then
    raise exception 'Only @ms.bulsu.edu.ph accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role, is_test_account)
  values (
    new.id,
    lower(new.email),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', '')
    ),
    case when is_test_teacher then 'instructor'::public.user_role else public.infer_profile_role(new.email) end,
    is_test_teacher
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

grant select, update on public.profiles to authenticated;
