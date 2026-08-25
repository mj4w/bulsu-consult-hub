create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  consultation_request_id uuid not null references public.consultation_requests(id) on delete cascade,
  email_type text not null,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (consultation_request_id, email_type, recipient_email)
);

alter table public.email_logs enable row level security;

drop policy if exists "Users can view own consultation email logs"
  on public.email_logs;

create policy "Users can view own consultation email logs"
  on public.email_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.consultation_requests request
      where request.id = email_logs.consultation_request_id
        and (
          request.student_id = auth.uid()
          or request.instructor_id = auth.uid()
        )
    )
  );

comment on table public.email_logs is
  'Records consultation notification emails so the app does not send duplicate transactional emails.';
