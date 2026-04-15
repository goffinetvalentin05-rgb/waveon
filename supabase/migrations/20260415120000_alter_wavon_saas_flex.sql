-- ==========================================================
-- Wavon SaaS - ALTER migration (retro-compatible)
-- Adds missing flexible SaaS columns + robust overlap constraint.
-- ==========================================================

create extension if not exists btree_gist;

-- ----------------------------------------------------------
-- Businesses: add missing fields
-- ----------------------------------------------------------
alter table public.wavon_businesses
  add column if not exists business_type text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists public_description text,
  add column if not exists public_welcome_message text,
  add column if not exists public_show_phone boolean not null default true,
  add column if not exists public_show_address boolean not null default true,
  add column if not exists public_show_description boolean not null default true,
  add column if not exists public_logo_url text,
  add column if not exists public_accent_color text;

-- ----------------------------------------------------------
-- Settings: add missing booking rules + public messages
-- ----------------------------------------------------------
alter table public.wavon_settings
  add column if not exists maximum_days_in_advance int not null default 365,
  add column if not exists slot_interval_minutes int not null default 15,
  add column if not exists minimum_gap_between_bookings int not null default 0,
  add column if not exists allow_cancellation boolean not null default true,
  add column if not exists cancellation_deadline_hours int not null default 0,
  add column if not exists allow_reschedule boolean not null default true,
  add column if not exists reschedule_deadline_hours int not null default 0,
  add column if not exists same_day_booking_allowed boolean not null default true,
  add column if not exists public_after_booking_message text not null default 'Ta demande est enregistrée. À très bientôt.';

do $$ begin
  alter table public.wavon_settings
    add constraint wavon_maximum_days_in_advance_check check (maximum_days_in_advance >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_settings
    add constraint wavon_slot_interval_minutes_check check (slot_interval_minutes in (5, 10, 15, 20, 30, 60));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_settings
    add constraint wavon_minimum_gap_between_bookings_check check (minimum_gap_between_bookings >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_settings
    add constraint wavon_cancellation_deadline_hours_check check (cancellation_deadline_hours >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_settings
    add constraint wavon_reschedule_deadline_hours_check check (reschedule_deadline_hours >= 0);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------
-- Services: add missing flexibility fields
-- ----------------------------------------------------------
alter table public.wavon_services
  add column if not exists is_active boolean not null default true,
  add column if not exists is_public boolean not null default true,
  add column if not exists color text,
  add column if not exists buffer_before_minutes int not null default 0,
  add column if not exists buffer_after_minutes int not null default 0,
  add column if not exists booking_notice_hours int,
  add column if not exists sort_order int not null default 0;

do $$ begin
  alter table public.wavon_services
    add constraint wavon_service_buffer_before_check check (buffer_before_minutes >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_services
    add constraint wavon_service_buffer_after_check check (buffer_after_minutes >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_services
    add constraint wavon_service_booking_notice_hours_check check (booking_notice_hours is null or booking_notice_hours >= 0);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------
-- Reservations: add snapshot fields + busy_range + constraint
-- ----------------------------------------------------------
alter table public.wavon_reservations
  add column if not exists duration_minutes int not null default 0,
  add column if not exists buffer_before_minutes int not null default 0,
  add column if not exists buffer_after_minutes int not null default 0;

do $$ begin
  alter table public.wavon_reservations
    add constraint wavon_reservation_duration_check check (duration_minutes >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_reservations
    add constraint wavon_reservation_buffers_check check (buffer_before_minutes >= 0 and buffer_after_minutes >= 0);
exception when duplicate_object then null; end $$;

-- busy_range: use a normal column + trigger (generated column requires IMMUTABLE)
-- Make the migration re-runnable safely.
alter table public.wavon_reservations
  drop constraint if exists wavon_reservations_no_overlap;

drop index if exists public.wavon_reservations_busy_range_gist;

alter table public.wavon_reservations
  drop column if exists busy_range;

alter table public.wavon_reservations
  add column if not exists busy_range tstzrange;

create or replace function public.wavon_set_reservation_busy_range()
returns trigger
language plpgsql
as $$
begin
  new.busy_range :=
    tstzrange(
      new.start_at - (greatest(0, new.buffer_before_minutes) * interval '1 minute'),
      new.end_at + (greatest(0, new.buffer_after_minutes) * interval '1 minute'),
      '[)'
    );
  return new;
end;
$$;

drop trigger if exists wavon_reservations_set_busy_range on public.wavon_reservations;
create trigger wavon_reservations_set_busy_range
before insert or update of start_at, end_at, buffer_before_minutes, buffer_after_minutes
on public.wavon_reservations
for each row execute function public.wavon_set_reservation_busy_range();

-- Backfill existing rows
update public.wavon_reservations
set busy_range =
  tstzrange(
    start_at - (greatest(0, buffer_before_minutes) * interval '1 minute'),
    end_at + (greatest(0, buffer_after_minutes) * interval '1 minute'),
    '[)'
  )
where busy_range is null;

-- Prevent overlap (confirmed + pending block)
do $$ begin
  alter table public.wavon_reservations
    add constraint wavon_reservations_no_overlap
    exclude using gist (
      business_id with =,
      busy_range with &&
    )
    where (status in ('confirmed','pending'));
exception
  when duplicate_object then null;
end $$;

create index if not exists wavon_reservations_busy_range_gist
  on public.wavon_reservations using gist (business_id, busy_range);

-- ----------------------------------------------------------
-- Email templates: create if missing + RLS policy + init defaults
-- ----------------------------------------------------------
do $$ begin
  create type public.wavon_email_template_type as enum ('confirmation','reminder','cancellation');
exception when duplicate_object then null; end $$;

create table if not exists public.wavon_email_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  type public.wavon_email_template_type not null,
  is_enabled boolean not null default true,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, type)
);

alter table public.wavon_email_templates enable row level security;

drop policy if exists "Wavon email templates owner CRUD" on public.wavon_email_templates;
create policy "Wavon email templates owner CRUD"
  on public.wavon_email_templates
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

drop trigger if exists wavon_email_templates_set_updated_at on public.wavon_email_templates;
create trigger wavon_email_templates_set_updated_at
before update on public.wavon_email_templates
for each row execute function public.wavon_set_updated_at();

-- Backfill templates for existing businesses
insert into public.wavon_email_templates (business_id, type, is_enabled, subject, body)
select
  b.id,
  t.type::public.wavon_email_template_type,
  t.is_enabled,
  t.subject,
  t.body
from public.wavon_businesses b
cross join (
  values
    ('confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    ('reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    ('cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
) as t(type, is_enabled, subject, body)
on conflict (business_id, type) do nothing;

