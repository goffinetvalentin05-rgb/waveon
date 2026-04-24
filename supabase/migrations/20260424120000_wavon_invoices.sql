-- Waevon : Factures (invoices) + paramètres facturation.
-- Objectifs :
-- - factures liées aux réservations (multi-tenant via business_id)
-- - numérotation unique par business et année
-- - accès strict : uniquement plan Pro actif (RLS + API)

create extension if not exists pgcrypto;

-- ----------------------------------------------------------
-- Accès feature (plan Pro / invoices)
-- ----------------------------------------------------------

create or replace function public.wavon_can_access_feature(
  p_business_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select
        case
          when p_feature = 'invoices' then
            coalesce(b.subscription_status, '') in ('active', 'past_due')
            and coalesce(b.subscription_plan, '') = 'pro'
          else
            coalesce(b.subscription_status, '') in ('active', 'past_due')
        end
      from public.wavon_businesses b
      where b.id = p_business_id
    ),
    false
  );
$$;

comment on function public.wavon_can_access_feature(uuid, text) is
  'Contrôle simple par feature : invoices => plan pro + subscription active/past_due.';

-- ----------------------------------------------------------
-- Types
-- ----------------------------------------------------------

do $$ begin
  create type public.wavon_invoice_status as enum ('draft', 'sent', 'paid', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------
-- Tables
-- ----------------------------------------------------------

create table if not exists public.wavon_invoice_counters (
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  year int not null,
  last_number int not null default 0,
  primary key (business_id, year),
  constraint wavon_invoice_counters_year_check check (year >= 2000 and year <= 3000),
  constraint wavon_invoice_counters_last_number_check check (last_number >= 0)
);

create table if not exists public.wavon_invoice_settings (
  business_id uuid primary key references public.wavon_businesses(id) on delete cascade,
  auto_create_on_confirmed boolean not null default false,
  company_name text,
  company_address text,
  company_email text,
  company_vat_ide text,
  payment_terms text not null default 'Paiement à 30 jours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wavon_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  reservation_id uuid not null references public.wavon_reservations(id) on delete cascade,
  invoice_number text not null,
  status public.wavon_invoice_status not null default 'draft',

  -- Snapshot minimal pour affichage stable (même si client/service changent ensuite)
  client_name text not null default '',
  client_email text,
  client_phone text,
  reservation_start_at timestamptz not null,
  service_name text not null default '',
  service_price int not null default 0,
  currency text not null default 'CHF',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,

  constraint wavon_invoices_service_price_check check (service_price >= 0),
  constraint wavon_invoices_invoice_number_non_empty check (length(trim(invoice_number)) > 0),
  unique (business_id, reservation_id),
  unique (business_id, invoice_number)
);

create index if not exists wavon_invoices_business_id_created_at_idx
  on public.wavon_invoices (business_id, created_at desc);
create index if not exists wavon_invoices_reservation_id_idx
  on public.wavon_invoices (reservation_id);

-- ----------------------------------------------------------
-- updated_at trigger reuse
-- ----------------------------------------------------------

drop trigger if exists wavon_invoice_settings_set_updated_at on public.wavon_invoice_settings;
create trigger wavon_invoice_settings_set_updated_at
before update on public.wavon_invoice_settings
for each row execute function public.wavon_set_updated_at();

drop trigger if exists wavon_invoices_set_updated_at on public.wavon_invoices;
create trigger wavon_invoices_set_updated_at
before update on public.wavon_invoices
for each row execute function public.wavon_set_updated_at();

-- ----------------------------------------------------------
-- Numérotation factures
-- ----------------------------------------------------------

create or replace function public.wavon_assign_invoice_number()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_next int;
begin
  if new.invoice_number is not null and length(trim(new.invoice_number)) > 0 then
    return new;
  end if;

  insert into public.wavon_invoice_counters (business_id, year, last_number)
  values (new.business_id, v_year, 1)
  on conflict (business_id, year) do update
    set last_number = public.wavon_invoice_counters.last_number + 1
  returning last_number into v_next;

  new.invoice_number := 'F-' || v_year::text || '-' || lpad(v_next::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists wavon_invoices_assign_number on public.wavon_invoices;
create trigger wavon_invoices_assign_number
before insert on public.wavon_invoices
for each row execute function public.wavon_assign_invoice_number();

-- ----------------------------------------------------------
-- Génération facture depuis une réservation (auto)
-- ----------------------------------------------------------

create or replace function public.wavon_create_invoice_from_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.wavon_reservations%rowtype;
  c public.wavon_clients%rowtype;
  s public.wavon_services%rowtype;
  b public.wavon_businesses%rowtype;
  existing_id uuid;
  new_id uuid;
begin
  select * into r from public.wavon_reservations where id = p_reservation_id;
  if not found then
    raise exception 'Réservation introuvable';
  end if;

  -- Plan / accès : refuse si feature non autorisée
  if not public.wavon_can_access_feature(r.business_id, 'invoices') then
    raise exception 'Accès factures non autorisé pour ce compte';
  end if;

  select id into existing_id
  from public.wavon_invoices
  where business_id = r.business_id
    and reservation_id = r.id;
  if existing_id is not null then
    return existing_id;
  end if;

  select * into s from public.wavon_services where id = r.service_id;
  select * into b from public.wavon_businesses where id = r.business_id;
  if r.client_id is not null then
    select * into c from public.wavon_clients where id = r.client_id;
  end if;

  insert into public.wavon_invoices (
    business_id,
    reservation_id,
    invoice_number,
    status,
    client_name,
    client_email,
    client_phone,
    reservation_start_at,
    service_name,
    service_price,
    currency
  )
  values (
    r.business_id,
    r.id,
    '',
    'draft',
    coalesce(nullif(trim(r.client_name), ''), coalesce(nullif(trim(c.full_name), ''), 'Client')),
    nullif(trim(c.email), ''),
    nullif(trim(c.phone), ''),
    r.start_at,
    coalesce(nullif(trim(s.name), ''), 'Service'),
    coalesce(s.price, 0),
    coalesce(nullif(trim(b.currency), ''), 'CHF')
  )
  returning id into new_id;

  -- Ensure invoice settings row exists (best-effort)
  insert into public.wavon_invoice_settings (business_id)
  values (r.business_id)
  on conflict (business_id) do nothing;

  return new_id;
end;
$$;

create or replace function public.wavon_maybe_auto_create_invoice()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  enabled boolean;
begin
  -- Auto uniquement si statut = confirmed (insert) ou passage à confirmed (update)
  if tg_op = 'INSERT' then
    if new.status <> 'confirmed' then
      return new;
    end if;
  else
    if new.status <> 'confirmed' or old.status = 'confirmed' then
      return new;
    end if;
  end if;

  -- Feature + settings
  if not public.wavon_can_access_feature(new.business_id, 'invoices') then
    return new;
  end if;

  select coalesce(s.auto_create_on_confirmed, false) into enabled
  from public.wavon_invoice_settings s
  where s.business_id = new.business_id;

  if not coalesce(enabled, false) then
    return new;
  end if;

  begin
    perform public.wavon_create_invoice_from_reservation(new.id);
  exception
    when others then
      -- ne bloque jamais la réservation
      null;
  end;

  return new;
end;
$$;

drop trigger if exists wavon_reservations_auto_invoice on public.wavon_reservations;
create trigger wavon_reservations_auto_invoice
after insert or update of status on public.wavon_reservations
for each row execute function public.wavon_maybe_auto_create_invoice();

-- ----------------------------------------------------------
-- RLS
-- ----------------------------------------------------------

alter table public.wavon_invoice_counters enable row level security;
alter table public.wavon_invoice_settings enable row level security;
alter table public.wavon_invoices enable row level security;

-- Counters: inaccessible via API (defense in depth)
drop policy if exists "Wavon invoice counters no access" on public.wavon_invoice_counters;
create policy "Wavon invoice counters no access"
  on public.wavon_invoice_counters
  for all
  using (false)
  with check (false);

-- Invoice settings (Pro only)
drop policy if exists "Wavon invoice settings owner select" on public.wavon_invoice_settings;
drop policy if exists "Wavon invoice settings owner insert" on public.wavon_invoice_settings;
drop policy if exists "Wavon invoice settings owner update" on public.wavon_invoice_settings;
drop policy if exists "Wavon invoice settings owner delete" on public.wavon_invoice_settings;
create policy "Wavon invoice settings owner select"
  on public.wavon_invoice_settings
  for select
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoice settings owner insert"
  on public.wavon_invoice_settings
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoice settings owner update"
  on public.wavon_invoice_settings
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoice settings owner delete"
  on public.wavon_invoice_settings
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );

-- Invoices (Pro only)
drop policy if exists "Wavon invoices owner select" on public.wavon_invoices;
drop policy if exists "Wavon invoices owner insert" on public.wavon_invoices;
drop policy if exists "Wavon invoices owner update" on public.wavon_invoices;
drop policy if exists "Wavon invoices owner delete" on public.wavon_invoices;
create policy "Wavon invoices owner select"
  on public.wavon_invoices
  for select
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoices owner insert"
  on public.wavon_invoices
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoices owner update"
  on public.wavon_invoices
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );
create policy "Wavon invoices owner delete"
  on public.wavon_invoices
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_can_access_feature(business_id, 'invoices')
  );

