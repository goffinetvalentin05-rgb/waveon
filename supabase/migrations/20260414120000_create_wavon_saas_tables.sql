create extension if not exists pgcrypto;

-- ==========================================================
-- Wavon SaaS (multi-tenant simple via business_id)
-- ==========================================================

create table if not exists public.wavon_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text,
  public_slug text unique,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_public_slug_format check (
    public_slug is null
    or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create table if not exists public.wavon_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.wavon_businesses(id) on delete cascade,
  minimum_notice_hours int not null default 0,
  minimum_service_duration int not null default 15,
  auto_confirm_reservations boolean not null default false,
  availability_mode text not null default 'fixed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_availability_mode_check check (availability_mode in ('fixed', 'custom')),
  constraint wavon_minimum_notice_hours_check check (minimum_notice_hours >= 0),
  constraint wavon_minimum_service_duration_check check (minimum_service_duration >= 5)
);

create table if not exists public.wavon_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null,
  price int not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_service_duration_check check (duration_minutes >= 5),
  constraint wavon_service_price_check check (price >= 0)
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
  status public.wavon_reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_reservation_time_check check (end_at > start_at)
);

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
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_services.business_id
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

