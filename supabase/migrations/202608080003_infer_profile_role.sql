-- Infer the dashboard role from the official BulSU email format.
-- Numeric usernames are students; named usernames are instructors.

create or replace function public.infer_profile_role(user_email text)
returns public.user_role
language sql
immutable
as $$
  select case
    when lower(user_email) ~ '^[0-9]+@ms\\.bulsu\\.edu\\.ph$'
      then 'student'::public.user_role
    else 'instructor'::public.user_role
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is null or new.email !~* '^[^@\\s]+@ms\\.bulsu\\.edu\\.ph$' then
    raise exception 'Only @ms.bulsu.edu.ph accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    public.infer_profile_role(new.email)
  );
  return new;
end;
$$;

-- Update profiles created before automatic role inference was added.
alter table public.profiles disable trigger profiles_role_protection;

update public.profiles
set role = public.infer_profile_role(email),
    updated_at = timezone('utc', now())
where email ~* '^[^@\\s]+@ms\\.bulsu\\.edu\\.ph$';

alter table public.profiles enable trigger profiles_role_protection;
