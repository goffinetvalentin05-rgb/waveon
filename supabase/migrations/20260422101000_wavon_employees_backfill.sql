-- ==========================================================
-- Waevon : multi-employés (3/3) - Données par défaut + backfill
-- - Crée 1 employé par business existant si absent
-- - Backfill employee_id sur réservations + horaires
-- - Met à jour la contrainte anti-chevauchement pour être par employé
-- ==========================================================

-- 1) Créer un employé "Moi" par business si besoin
insert into public.wavon_employees (business_id, name, color, is_active, display_order)
select b.id, 'Moi', '#0a0a0a', true, 0
from public.wavon_businesses b
where not exists (
  select 1 from public.wavon_employees e where e.business_id = b.id
);

-- 2) Backfill employee_id pour les réservations existantes
update public.wavon_reservations r
set employee_id = e.id
from public.wavon_employees e
where r.employee_id is null
  and e.business_id = r.business_id
  and e.display_order = 0;

-- Fallback (si display_order 0 n'existe pas): prendre le premier employé par business
update public.wavon_reservations r
set employee_id = e.id
from (
  select distinct on (business_id) id, business_id
  from public.wavon_employees
  order by business_id, display_order asc, created_at asc
) e
where r.employee_id is null
  and e.business_id = r.business_id;

-- 3) Backfill employee_id pour les horaires existants (weekly/custom/blocked)
update public.wavon_availability_rules a
set employee_id = e.id
from (
  select distinct on (business_id) id, business_id
  from public.wavon_employees
  order by business_id, display_order asc, created_at asc
) e
where a.employee_id is null
  and e.business_id = a.business_id;

update public.wavon_custom_days c
set employee_id = e.id
from (
  select distinct on (business_id) id, business_id
  from public.wavon_employees
  order by business_id, display_order asc, created_at asc
) e
where c.employee_id is null
  and e.business_id = c.business_id;

update public.wavon_blocked_dates d
set employee_id = e.id
from (
  select distinct on (business_id) id, business_id
  from public.wavon_employees
  order by business_id, display_order asc, created_at asc
) e
where d.employee_id is null
  and e.business_id = d.business_id;

-- 4) Contrôle d'intégrité: empêcher employee_id NULL sur les nouvelles données d'horaires
-- (On garde la colonne nullable pour compat, mais on la remplit toujours en pratique.)
do $$ begin
  alter table public.wavon_availability_rules
    drop constraint if exists wavon_availability_rules_employee_id_required;
  alter table public.wavon_availability_rules
    add constraint wavon_availability_rules_employee_id_required
    check (employee_id is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_custom_days
    drop constraint if exists wavon_custom_days_employee_id_required;
  alter table public.wavon_custom_days
    add constraint wavon_custom_days_employee_id_required
    check (employee_id is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_blocked_dates
    drop constraint if exists wavon_blocked_dates_employee_id_required;
  alter table public.wavon_blocked_dates
    add constraint wavon_blocked_dates_employee_id_required
    check (employee_id is not null);
exception when duplicate_object then null; end $$;

-- 5) Mettre à jour l'exclusion constraint: chevauchement par employee (et non plus par business)
do $$
begin
  alter table public.wavon_reservations
    drop constraint if exists wavon_reservations_no_overlap;
  drop index if exists public.wavon_reservations_no_overlap;

  alter table public.wavon_reservations
    add constraint wavon_reservations_no_overlap
    exclude using gist (
      business_id with =,
      employee_id with =,
      busy_range with &&
    )
    where (status in ('confirmed','pending'));
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

create index if not exists wavon_reservations_busy_range_employee_gist
  on public.wavon_reservations using gist (business_id, employee_id, busy_range);

