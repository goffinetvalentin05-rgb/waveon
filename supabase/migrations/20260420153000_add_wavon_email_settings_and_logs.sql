-- Phase 3: configurable transactional emails (reminder + post-service)

-- Types
do $$ begin
  create type public.wavon_email_setting_type as enum ('reminder_before', 'post_service');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.wavon_email_log_status as enum ('pending', 'sent', 'error', 'skipped');
exception
  when duplicate_object then null;
end $$;

-- Settings per business + type
create table if not exists public.wavon_email_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  type public.wavon_email_setting_type not null,
  enabled boolean not null default true,
  delay_hours int not null default 24,
  subject text not null default '',
  body text not null default '',
  custom_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, type),
  constraint wavon_email_settings_delay_hours_check check (delay_hours >= 0),
  constraint wavon_email_settings_custom_links_is_object check (jsonb_typeof(custom_links) = 'object')
);

-- Email logs to avoid duplicates + debug
create table if not exists public.wavon_email_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  reservation_id uuid references public.wavon_reservations(id) on delete set null,
  type public.wavon_email_setting_type not null,
  recipient_email text not null,
  status public.wavon_email_log_status not null default 'pending',
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, reservation_id, type, recipient_email)
);

create index if not exists wavon_email_logs_business_id_created_at_idx
  on public.wavon_email_logs(business_id, created_at desc);
create index if not exists wavon_email_logs_reservation_id_idx
  on public.wavon_email_logs(reservation_id);

-- updated_at triggers (reuse existing wavon_set_updated_at)
drop trigger if exists wavon_email_settings_set_updated_at on public.wavon_email_settings;
create trigger wavon_email_settings_set_updated_at
before update on public.wavon_email_settings
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_email_logs_set_updated_at on public.wavon_email_logs;
create trigger wavon_email_logs_set_updated_at
before update on public.wavon_email_logs
for each row execute function public.wavon_set_updated_at();

-- RLS
alter table public.wavon_email_settings enable row level security;
alter table public.wavon_email_logs enable row level security;

drop policy if exists "Wavon email settings owner CRUD" on public.wavon_email_settings;
create policy "Wavon email settings owner CRUD"
  on public.wavon_email_settings
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

drop policy if exists "Wavon email logs owner read" on public.wavon_email_logs;
create policy "Wavon email logs owner read"
  on public.wavon_email_logs
  for select
  using (public.wavon_is_business_owner(business_id));

-- Backfill defaults for existing businesses
insert into public.wavon_email_settings (business_id, type, enabled, delay_hours, subject, body, custom_links)
select
  b.id,
  t.type::public.wavon_email_setting_type,
  t.enabled,
  t.delay_hours,
  t.subject,
  t.body,
  t.custom_links::jsonb
from public.wavon_businesses b
cross join (
  values
    (
      'reminder_before',
      true,
      24,
      'Rappel de votre rendez-vous chez {{business_name}}',
      'Bonjour {{client_name}},\n\nPetit rappel : {{service_name}} le {{reservation_date}} à {{reservation_time}}.\n\nÀ bientôt,\n{{business_name}}',
      '{}'::text
    ),
    (
      'post_service',
      true,
      2,
      'Merci pour votre visite chez {{business_name}}',
      'Bonjour {{client_name}},\n\nMerci pour votre venue.\n\nSi vous avez 30 secondes, un avis nous aide énormément :',
      '{"google_review":"","instagram":"","tiktok":"","website":"","other_label":"","other_url":""}'::text
    )
) as t(type, enabled, delay_hours, subject, body, custom_links)
on conflict (business_id, type) do nothing;

