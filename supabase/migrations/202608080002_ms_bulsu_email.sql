-- Restrict existing profile validation to official MS BulSU addresses.

alter table public.profiles
  drop constraint if exists profiles_bulsu_email;

alter table public.profiles
  add constraint profiles_bulsu_email
  check (email ~* '^[^@\\s]+@ms\\.bulsu\\.edu\\.ph$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role public.user_role := 'student';
begin
  if new.email is null or new.email !~* '^[^@\\s]+@ms\\.bulsu\\.edu\\.ph$' then
    raise exception 'Only @ms.bulsu.edu.ph accounts are allowed';
  end if;

  begin
    requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student');
  exception when invalid_text_representation then
    requested_role := 'student';
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    requested_role
  );
  return new;
end;
$$;
