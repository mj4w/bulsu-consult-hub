-- Repair query for a partially executed profiles migration.
-- Safe to run after 202608080001_profiles.sql partially created user_role.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'user_role') then
    create type public.user_role as enum ('student', 'instructor');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  program text,
  section text,
  phone_number text,
  role public.user_role not null default 'student',
  department text,
  job_title text,
  office_location text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists department text,
  add column if not exists job_title text,
  add column if not exists office_location text;

alter table public.profiles drop constraint if exists profiles_bulsu_email;
alter table public.profiles add constraint profiles_bulsu_email
  check (email ~* '^[^@\s]+@ms\.bulsu\.edu\.ph$');

create or replace function public.infer_profile_role(user_email text)
returns public.user_role
language sql
immutable
as $$
  select case
    when lower(user_email) ~ '^[0-9]+@ms\.bulsu\.edu\.ph$' then 'student'::public.user_role
    else 'instructor'::public.user_role
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is null or new.email !~* '^[^@\s]+@ms\.bulsu\.edu\.ph$' then
    raise exception 'Only @ms.bulsu.edu.ph accounts are allowed';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', '')
    ),
    public.infer_profile_role(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Profile roles can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_protection on public.profiles;
create trigger profiles_role_protection
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;

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
