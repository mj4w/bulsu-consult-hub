create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.google_calendar_connections enable row level security;

drop policy if exists "Users can read their own Google Calendar connection"
  on public.google_calendar_connections;
create policy "Users can read their own Google Calendar connection"
  on public.google_calendar_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own Google Calendar connection"
  on public.google_calendar_connections;
create policy "Users can create their own Google Calendar connection"
  on public.google_calendar_connections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Google Calendar connection"
  on public.google_calendar_connections;
create policy "Users can update their own Google Calendar connection"
  on public.google_calendar_connections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Google Calendar connection"
  on public.google_calendar_connections;
create policy "Users can delete their own Google Calendar connection"
  on public.google_calendar_connections
  for delete
  using (auth.uid() = user_id);

drop trigger if exists google_calendar_connections_updated_at
  on public.google_calendar_connections;
create trigger google_calendar_connections_updated_at
  before update on public.google_calendar_connections
  for each row execute procedure public.set_updated_at();

alter table public.instructor_availability
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_synced_at timestamptz;

comment on table public.google_calendar_connections is
  'Stores instructor Google OAuth tokens for generating Google Calendar events with Google Meet links.';

comment on column public.instructor_availability.google_calendar_event_id is
  'Google Calendar event ID created when a Google Meet link is auto-generated for the availability window.';

comment on column public.instructor_availability.google_calendar_synced_at is
  'Timestamp when the Google Calendar event and Meet link were generated.';
