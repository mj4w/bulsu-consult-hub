create table if not exists public.user_walkthroughs (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope),
  constraint user_walkthroughs_scope_not_blank check (length(trim(scope)) > 0)
);

alter table public.user_walkthroughs enable row level security;

drop policy if exists "Users can view their own walkthroughs" on public.user_walkthroughs;
create policy "Users can view their own walkthroughs"
on public.user_walkthroughs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own walkthroughs" on public.user_walkthroughs;
create policy "Users can insert their own walkthroughs"
on public.user_walkthroughs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own walkthroughs" on public.user_walkthroughs;
create policy "Users can update their own walkthroughs"
on public.user_walkthroughs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
