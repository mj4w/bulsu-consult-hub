create table if not exists public.email_action_tokens (
  id uuid primary key default gen_random_uuid(),
  consultation_request_id uuid not null references public.consultation_requests(id) on delete cascade,
  action text not null check (action in ('approve', 'decline')),
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_action_tokens_request_idx
  on public.email_action_tokens (consultation_request_id, created_at desc);

alter table public.email_action_tokens enable row level security;

drop policy if exists "No direct client access to email action tokens"
  on public.email_action_tokens;

create policy "No direct client access to email action tokens"
  on public.email_action_tokens
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.email_action_tokens is
  'One-time signed email action tokens for instructor approval or decline links.';
