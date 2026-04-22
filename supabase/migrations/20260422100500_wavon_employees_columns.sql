-- ==========================================================
-- Waevon : multi-employés (2/3) - Colonnes sur tables existantes
-- ==========================================================

-- Services: liste d'employés autorisés (vide = tous les employés actifs)
alter table public.wavon_services
  add column if not exists employee_ids uuid[] not null default '{}'::uuid[];

-- Reservations: assignation d'un prestataire (nullable pour compat)
alter table public.wavon_reservations
  add column if not exists employee_id uuid references public.wavon_employees(id) on delete restrict;

create index if not exists wavon_reservations_employee_id_idx
  on public.wavon_reservations(employee_id, start_at asc);

-- Horaires (tables existantes): lier les règles / exceptions / blocages à un prestataire
alter table public.wavon_availability_rules
  add column if not exists employee_id uuid references public.wavon_employees(id) on delete cascade;

alter table public.wavon_custom_days
  add column if not exists employee_id uuid references public.wavon_employees(id) on delete cascade;

alter table public.wavon_blocked_dates
  add column if not exists employee_id uuid references public.wavon_employees(id) on delete cascade;

-- Uniques: inclure employee_id (la migration 3 backfill employee_id => plus de NULL dans la pratique)
alter table public.wavon_availability_rules
  drop constraint if exists wavon_availability_rules_business_id_day_of_week_key;

do $$ begin
  alter table public.wavon_availability_rules
    add constraint wavon_availability_rules_business_employee_dow_unique
    unique (business_id, employee_id, day_of_week);
exception when duplicate_object then null; end $$;

alter table public.wavon_custom_days
  drop constraint if exists wavon_custom_days_business_id_day_key;

do $$ begin
  alter table public.wavon_custom_days
    add constraint wavon_custom_days_business_employee_day_unique
    unique (business_id, employee_id, day);
exception when duplicate_object then null; end $$;

alter table public.wavon_blocked_dates
  drop constraint if exists wavon_blocked_dates_business_id_blocked_date_key;

do $$ begin
  alter table public.wavon_blocked_dates
    add constraint wavon_blocked_dates_business_employee_day_unique
    unique (business_id, employee_id, blocked_date);
exception when duplicate_object then null; end $$;

create index if not exists wavon_availability_rules_business_employee_idx
  on public.wavon_availability_rules(business_id, employee_id, day_of_week);

create index if not exists wavon_custom_days_business_employee_idx
  on public.wavon_custom_days(business_id, employee_id, day);

create index if not exists wavon_blocked_dates_business_employee_idx
  on public.wavon_blocked_dates(business_id, employee_id, blocked_date);

