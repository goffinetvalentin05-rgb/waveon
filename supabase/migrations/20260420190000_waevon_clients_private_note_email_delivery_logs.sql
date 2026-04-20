-- Note privée commerçant par client
alter table public.wavon_clients
  add column if not exists private_note text;

-- Journal unifié des envois transactionnels (service role côté API)
create table if not exists public.wavon_email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  reservation_id uuid references public.wavon_reservations(id) on delete set null,
  email_type text not null
    constraint wavon_email_delivery_logs_email_type_check check (
      email_type in ('confirmation', 'rappel', 'annulation', 'post_prestation')
    ),
  recipient text not null,
  status text not null
    constraint wavon_email_delivery_logs_status_check check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists wavon_email_delivery_logs_business_sent_at_idx
  on public.wavon_email_delivery_logs (business_id, sent_at desc);

create index if not exists wavon_email_delivery_logs_reservation_idx
  on public.wavon_email_delivery_logs (reservation_id);

alter table public.wavon_email_delivery_logs enable row level security;

drop policy if exists "Waevon email delivery logs owner read" on public.wavon_email_delivery_logs;
create policy "Waevon email delivery logs owner read"
  on public.wavon_email_delivery_logs
  for select
  using (public.wavon_is_business_owner(business_id));
