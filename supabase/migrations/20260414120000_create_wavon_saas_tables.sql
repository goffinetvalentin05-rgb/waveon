create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ==========================================================
-- Wavon SaaS (multi-tenant simple via business_id)
-- ==========================================================

create table if not exists public.wavon_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text,
  business_type text,
  email text,
  public_slug text unique,
  website text,
  phone text,
  address text,
  city text,
  postal_code text,
  public_description text,
  public_welcome_message text,
  public_show_phone boolean not null default true,
  public_show_address boolean not null default true,
  public_show_description boolean not null default true,
  public_logo_url text,
  public_accent_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_public_slug_format check (
    public_slug is null
    or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

-- Legacy-ish name kept, but now acts as "booking settings"
create table if not exists public.wavon_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.wavon_businesses(id) on delete cascade,
  -- Booking rules
  auto_confirm_reservations boolean not null default false,
  minimum_notice_hours int not null default 0,
  maximum_days_in_advance int not null default 365,
  slot_interval_minutes int not null default 15,
  minimum_gap_between_bookings int not null default 0,
  allow_cancellation boolean not null default true,
  cancellation_deadline_hours int not null default 0,
  allow_reschedule boolean not null default true,
  reschedule_deadline_hours int not null default 0,
  same_day_booking_allowed boolean not null default true,
  -- Availability
  availability_mode text not null default 'fixed',
  -- Minimums (keep for compatibility)
  minimum_service_duration int not null default 15,
  -- Public booking UI message
  public_after_booking_message text not null default 'Ta demande est enregistrée. À très bientôt.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_availability_mode_check check (availability_mode in ('fixed', 'custom')),
  constraint wavon_minimum_notice_hours_check check (minimum_notice_hours >= 0),
  constraint wavon_minimum_service_duration_check check (minimum_service_duration >= 5),
  constraint wavon_maximum_days_in_advance_check check (maximum_days_in_advance >= 0),
  constraint wavon_slot_interval_minutes_check check (slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  constraint wavon_minimum_gap_between_bookings_check check (minimum_gap_between_bookings >= 0),
  constraint wavon_cancellation_deadline_hours_check check (cancellation_deadline_hours >= 0),
  constraint wavon_reschedule_deadline_hours_check check (reschedule_deadline_hours >= 0)
);

create table if not exists public.wavon_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null,
  price int not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  is_public boolean not null default true,
  color text,
  buffer_before_minutes int not null default 0,
  buffer_after_minutes int not null default 0,
  booking_notice_hours int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_service_duration_check check (duration_minutes >= 5),
  constraint wavon_service_price_check check (price >= 0),
  constraint wavon_service_buffer_before_check check (buffer_before_minutes >= 0),
  constraint wavon_service_buffer_after_check check (buffer_after_minutes >= 0),
  constraint wavon_service_booking_notice_hours_check check (booking_notice_hours is null or booking_notice_hours >= 0)
);

create table if not exists public.wavon_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type public.wavon_reservation_status as enum ('confirmed', 'cancelled', 'pending');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.wavon_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  client_id uuid references public.wavon_clients(id) on delete set null,
  client_name text not null default '',
  service_id uuid not null references public.wavon_services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  -- Snapshot of booking parameters at time of booking (for robust overlap checks)
  duration_minutes int not null default 0,
  buffer_before_minutes int not null default 0,
  buffer_after_minutes int not null default 0,
  busy_range tstzrange,
  status public.wavon_reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_reservation_time_check check (end_at > start_at),
  constraint wavon_reservation_duration_check check (duration_minutes >= 0),
  constraint wavon_reservation_buffers_check check (buffer_before_minutes >= 0 and buffer_after_minutes >= 0)
);

-- Prevent overlapping reservations per business (confirmed + pending block)
-- Uses the generated busy_range which includes buffers.
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

-- Enforce service belongs to business + compute end_at if duration provided
create or replace function public.wavon_reservation_guard()
returns trigger
language plpgsql
as $$
declare
  svc public.wavon_services%rowtype;
begin
  select * into svc from public.wavon_services where id = new.service_id;
  if not found then
    raise exception 'Service introuvable';
  end if;
  if svc.business_id <> new.business_id then
    raise exception 'Service hors business';
  end if;

  -- Snapshot duration/buffers from service if not explicitly set
  if new.duration_minutes is null or new.duration_minutes <= 0 then
    new.duration_minutes := svc.duration_minutes;
  end if;
  if new.buffer_before_minutes is null then
    new.buffer_before_minutes := svc.buffer_before_minutes;
  end if;
  if new.buffer_after_minutes is null then
    new.buffer_after_minutes := svc.buffer_after_minutes;
  end if;
  new.buffer_before_minutes := greatest(0, new.buffer_before_minutes);
  new.buffer_after_minutes := greatest(0, new.buffer_after_minutes);

  -- If end_at not coherent, recompute from duration
  if new.end_at is null or new.end_at <= new.start_at then
    new.end_at := new.start_at + make_interval(mins => new.duration_minutes);
  end if;

  return new;
end;
$$;

drop trigger if exists wavon_reservations_guard on public.wavon_reservations;
create trigger wavon_reservations_guard
before insert or update on public.wavon_reservations
for each row execute function public.wavon_reservation_guard();

-- Weekly availability with multiple segments per day.
-- segments is jsonb array of objects: [{ "start": "09:00", "end": "12:00" }, ...]
create table if not exists public.wavon_availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  day_of_week int not null,
  is_open boolean not null default false,
  segments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_day_of_week_check check (day_of_week between 0 and 6),
  constraint wavon_segments_is_array check (jsonb_typeof(segments) = 'array'),
  unique (business_id, day_of_week)
);

create table if not exists public.wavon_custom_days (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  day date not null,
  segments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_custom_segments_is_array check (jsonb_typeof(segments) = 'array'),
  unique (business_id, day)
);

create table if not exists public.wavon_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  blocked_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (business_id, blocked_date)
);

-- Email templates stored per business (used by future email sender / UI now)
do $$ begin
  create type public.wavon_email_template_type as enum ('confirmation','reminder','cancellation');
exception
  when duplicate_object then null;
end $$;

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

-- Helpful indexes
create index if not exists wavon_services_business_id_idx
  on public.wavon_services(business_id, created_at desc);
create index if not exists wavon_clients_business_id_idx
  on public.wavon_clients(business_id, created_at desc);
create index if not exists wavon_reservations_business_id_start_at_idx
  on public.wavon_reservations(business_id, start_at asc);
create index if not exists wavon_reservations_service_id_idx
  on public.wavon_reservations(service_id);
create index if not exists wavon_reservations_client_id_idx
  on public.wavon_reservations(client_id);
create index if not exists wavon_blocked_dates_business_id_idx
  on public.wavon_blocked_dates(business_id, blocked_date asc);

-- ==========================================================
-- updated_at trigger
-- ==========================================================

create or replace function public.wavon_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wavon_businesses_set_updated_at on public.wavon_businesses;
create trigger wavon_businesses_set_updated_at
before update on public.wavon_businesses
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_settings_set_updated_at on public.wavon_settings;
create trigger wavon_settings_set_updated_at
before update on public.wavon_settings
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_services_set_updated_at on public.wavon_services;
create trigger wavon_services_set_updated_at
before update on public.wavon_services
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_clients_set_updated_at on public.wavon_clients;
create trigger wavon_clients_set_updated_at
before update on public.wavon_clients
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_reservations_set_updated_at on public.wavon_reservations;
create trigger wavon_reservations_set_updated_at
before update on public.wavon_reservations
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_availability_rules_set_updated_at on public.wavon_availability_rules;
create trigger wavon_availability_rules_set_updated_at
before update on public.wavon_availability_rules
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_custom_days_set_updated_at on public.wavon_custom_days;
create trigger wavon_custom_days_set_updated_at
before update on public.wavon_custom_days
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_email_templates_set_updated_at on public.wavon_email_templates;
create trigger wavon_email_templates_set_updated_at
before update on public.wavon_email_templates
for each row execute function public.wavon_set_updated_at();

-- ==========================================================
-- Minimal initialization for new accounts (NO demo data)
-- Creates a business + settings only.
-- ==========================================================

create or replace function public.wavon_init_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  insert into public.wavon_businesses (user_id)
  values (new.id)
  on conflict (user_id) do update set user_id = excluded.user_id
  returning id into v_business_id;

  insert into public.wavon_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  -- Ensure email templates exist (empty by default)
  insert into public.wavon_email_templates (business_id, type, is_enabled, subject, body)
  values
    (v_business_id, 'confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    (v_business_id, 'reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    (v_business_id, 'cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
  on conflict (business_id, type) do nothing;

  -- Ensure 7 availability rows exist (all closed by default)
  insert into public.wavon_availability_rules (business_id, day_of_week, is_open, segments)
  select v_business_id, d, false, '[]'::jsonb
  from generate_series(0,6) as d
  on conflict (business_id, day_of_week) do nothing;

  return new;
end;
$$;

drop trigger if exists wavon_on_auth_user_created on auth.users;
create trigger wavon_on_auth_user_created
after insert on auth.users
for each row execute function public.wavon_init_new_user();

-- ==========================================================
-- RLS
-- ==========================================================

alter table public.wavon_businesses enable row level security;
alter table public.wavon_settings enable row level security;
alter table public.wavon_services enable row level security;
alter table public.wavon_clients enable row level security;
alter table public.wavon_reservations enable row level security;
alter table public.wavon_availability_rules enable row level security;
alter table public.wavon_custom_days enable row level security;
alter table public.wavon_blocked_dates enable row level security;
alter table public.wavon_email_templates enable row level security;

-- Businesses: owner only
drop policy if exists "Wavon businesses selectable by owner" on public.wavon_businesses;
create policy "Wavon businesses selectable by owner"
  on public.wavon_businesses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Wavon businesses insertable by owner" on public.wavon_businesses;
create policy "Wavon businesses insertable by owner"
  on public.wavon_businesses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Wavon businesses updatable by owner" on public.wavon_businesses;
create policy "Wavon businesses updatable by owner"
  on public.wavon_businesses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Wavon businesses deletable by owner" on public.wavon_businesses;
create policy "Wavon businesses deletable by owner"
  on public.wavon_businesses
  for delete
  using (auth.uid() = user_id);

-- Helper: access via business ownership
create or replace function public.wavon_is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.wavon_businesses b
    where b.id = p_business_id
      and b.user_id = auth.uid()
  );
$$;

-- Settings
drop policy if exists "Wavon settings owner CRUD" on public.wavon_settings;
create policy "Wavon settings owner CRUD"
  on public.wavon_settings
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Services
drop policy if exists "Wavon services owner CRUD" on public.wavon_services;
create policy "Wavon services owner CRUD"
  on public.wavon_services
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Clients
drop policy if exists "Wavon clients owner CRUD" on public.wavon_clients;
create policy "Wavon clients owner CRUD"
  on public.wavon_clients
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Reservations
drop policy if exists "Wavon reservations owner CRUD" on public.wavon_reservations;
create policy "Wavon reservations owner CRUD"
  on public.wavon_reservations
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Weekly availability rules
drop policy if exists "Wavon availability rules owner CRUD" on public.wavon_availability_rules;
create policy "Wavon availability rules owner CRUD"
  on public.wavon_availability_rules
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Custom days
drop policy if exists "Wavon custom days owner CRUD" on public.wavon_custom_days;
create policy "Wavon custom days owner CRUD"
  on public.wavon_custom_days
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Blocked dates
drop policy if exists "Wavon blocked dates owner CRUD" on public.wavon_blocked_dates;
create policy "Wavon blocked dates owner CRUD"
  on public.wavon_blocked_dates
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Email templates
drop policy if exists "Wavon email templates owner CRUD" on public.wavon_email_templates;
create policy "Wavon email templates owner CRUD"
  on public.wavon_email_templates
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- ==========================================================
-- Public booking access (read-only via public_slug)
-- ==========================================================

-- Business public read by slug (minimal fields)
drop policy if exists "Wavon businesses public read by slug" on public.wavon_businesses;
create policy "Wavon businesses public read by slug"
  on public.wavon_businesses
  for select
  using (public_slug is not null);

-- Public can read services of a business that is published
drop policy if exists "Wavon services public read for published business" on public.wavon_services;
create policy "Wavon services public read for published business"
  on public.wavon_services
  for select
  using (
    is_public = true
    and is_active = true
    and
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_services.business_id
        and b.public_slug is not null
    )
  );

-- Public can read email templates & some public business fields (for future)
drop policy if exists "Wavon email templates public read for published business" on public.wavon_email_templates;
create policy "Wavon email templates public read for published business"
  on public.wavon_email_templates
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_email_templates.business_id
        and b.public_slug is not null
    )
  );

-- Public can read availability/blocked dates/settings for published business
drop policy if exists "Wavon availability public read for published business" on public.wavon_availability_rules;
create policy "Wavon availability public read for published business"
  on public.wavon_availability_rules
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_availability_rules.business_id
        and b.public_slug is not null
    )
  );

drop policy if exists "Wavon blocked dates public read for published business" on public.wavon_blocked_dates;
create policy "Wavon blocked dates public read for published business"
  on public.wavon_blocked_dates
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_blocked_dates.business_id
        and b.public_slug is not null
    )
  );

drop policy if exists "Wavon settings public read for published business" on public.wavon_settings;
create policy "Wavon settings public read for published business"
  on public.wavon_settings
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_settings.business_id
        and b.public_slug is not null
    )
  );

-- Public can create a reservation and a client on a published business
-- (kept minimal; stricter validation will be enforced at application layer for now)
drop policy if exists "Wavon clients public insert for published business" on public.wavon_clients;
create policy "Wavon clients public insert for published business"
  on public.wavon_clients
  for insert
  with check (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_clients.business_id
        and b.public_slug is not null
    )
  );

drop policy if exists "Wavon reservations public insert for published business" on public.wavon_reservations;
create policy "Wavon reservations public insert for published business"
  on public.wavon_reservations
  for insert
  with check (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_reservations.business_id
        and b.public_slug is not null
    )
  );

drop policy if exists "Wavon reservations public read for published business" on public.wavon_reservations;
create policy "Wavon reservations public read for published business"
  on public.wavon_reservations
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_reservations.business_id
        and b.public_slug is not null
    )
  );

