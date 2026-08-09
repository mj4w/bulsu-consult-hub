alter table public.instructor_availability
  add column if not exists instructor_display_name text;

update public.instructor_availability availability
set instructor_display_name = coalesce(
  nullif(profile.full_name, ''),
  split_part(profile.email, '@', 1)
)
from public.profiles profile
where profile.id = availability.instructor_id
  and availability.instructor_display_name is null;
