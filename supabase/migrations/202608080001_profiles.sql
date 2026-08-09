-- Phase 2: user profiles, roles, and row-level security.

create type public.user_role as enum ('student', 'instructor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  program text,
  section text,
  phone_number text,
  role public.user_role not null default 'student',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_bulsu_email check (email ~* '^[^@\\s]+@ms\\.bulsu\\.edu\\.ph$')
);

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

create trigger profiles_role_protection
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;
