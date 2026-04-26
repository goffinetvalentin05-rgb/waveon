-- Waevon : module facturation v2 — lignes multiples, snapshots client/business, totaux propres.
-- Objectifs :
--   - 1 facture peut contenir plusieurs lignes (`wavon_invoice_items`)
--   - snapshot du client (incl. adresse) + snapshot du commerce (incl. couleur primaire)
--   - sous-total, rabais, total stockés en `int` (centimes-équivalents) cohérents avec la ligne unique historique
--   - RPC `wavon_create_invoice_from_reservation` met à jour les nouveaux champs + crée la première ligne
--   - RLS : items uniquement accessibles via la facture rattachée

-- ----------------------------------------------------------
-- Colonnes additionnelles sur wavon_invoices
-- ----------------------------------------------------------

alter table public.wavon_invoices
  add column if not exists client_address text;

alter table public.wavon_invoices
  add column if not exists subtotal int not null default 0;

alter table public.wavon_invoices
  add column if not exists discount_amount int not null default 0;

alter table public.wavon_invoices
  add column if not exists payment_terms text;

alter table public.wavon_invoices
  add column if not exists business_primary_color text;

do $$ begin
  alter table public.wavon_invoices add constraint wavon_invoices_subtotal_non_negative check (subtotal >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.wavon_invoices add constraint wavon_invoices_discount_non_negative check (discount_amount >= 0);
exception when duplicate_object then null;
end $$;

-- Historique : si subtotal n'est pas renseigné, repli sur le total existant (modèle ligne unique).
update public.wavon_invoices
set subtotal = greatest(coalesce(total_amount, 0), coalesce(line_unit_price, 0), coalesce(service_price, 0))
where subtotal = 0;

update public.wavon_invoices
set total_amount = greatest(0, subtotal - coalesce(discount_amount, 0))
where total_amount = 0;

-- ----------------------------------------------------------
-- Table : lignes facture
-- ----------------------------------------------------------

create table if not exists public.wavon_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.wavon_invoices(id) on delete cascade,
  position int not null default 0,
  description text not null default '',
  quantity numeric(12, 2) not null default 1,
  unit_price int not null default 0,
  total int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wavon_invoice_items_quantity_check check (quantity >= 0),
  constraint wavon_invoice_items_unit_price_check check (unit_price >= 0),
  constraint wavon_invoice_items_total_check check (total >= 0)
);

create index if not exists wavon_invoice_items_invoice_id_idx
  on public.wavon_invoice_items (invoice_id, position asc, created_at asc);

drop trigger if exists wavon_invoice_items_set_updated_at on public.wavon_invoice_items;
create trigger wavon_invoice_items_set_updated_at
before update on public.wavon_invoice_items
for each row execute function public.wavon_set_updated_at();

-- Backfill : au moins une ligne par facture existante (recopie le snapshot de service).
insert into public.wavon_invoice_items (invoice_id, position, description, quantity, unit_price, total)
select
  inv.id,
  0,
  coalesce(nullif(trim(inv.service_name), ''), 'Prestation'),
  coalesce(nullif(inv.line_quantity, 0), 1),
  case
    when coalesce(inv.line_unit_price, 0) > 0 then inv.line_unit_price
    when coalesce(inv.service_price, 0) > 0 then inv.service_price
    else 0
  end,
  case
    when coalesce(inv.total_amount, 0) > 0 then inv.total_amount
    when coalesce(inv.line_unit_price, 0) > 0 then inv.line_unit_price
    when coalesce(inv.service_price, 0) > 0 then inv.service_price
    else 0
  end
from public.wavon_invoices inv
where not exists (
  select 1 from public.wavon_invoice_items it where it.invoice_id = inv.id
);

-- ----------------------------------------------------------
-- Helper : recalcule les totaux d'une facture à partir des items
-- ----------------------------------------------------------

create or replace function public.wavon_recompute_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub int;
  v_discount int;
  v_total int;
begin
  select coalesce(sum(it.total), 0)::int into v_sub
  from public.wavon_invoice_items it
  where it.invoice_id = p_invoice_id;

  select coalesce(discount_amount, 0)::int into v_discount
  from public.wavon_invoices
  where id = p_invoice_id;

  v_total := greatest(0, v_sub - coalesce(v_discount, 0));

  update public.wavon_invoices
  set
    subtotal = v_sub,
    total_amount = v_total
  where id = p_invoice_id;
end;
$$;

revoke all on function public.wavon_recompute_invoice_totals(uuid) from public;
grant execute on function public.wavon_recompute_invoice_totals(uuid) to postgres, service_role, authenticated;

-- ----------------------------------------------------------
-- RPC : création depuis une réservation, version v2 (items + snapshots)
-- ----------------------------------------------------------

create or replace function public.wavon_create_invoice_from_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.wavon_reservations%rowtype;
  s public.wavon_services%rowtype;
  b public.wavon_businesses%rowtype;
  iset public.wavon_invoice_settings%rowtype;
  c_name text;
  c_email text;
  c_phone text;
  v_addr text;
  v_brand_color text;
  existing_id uuid;
  new_id uuid;
  v_unit int;
  v_total int;
begin
  select * into r from public.wavon_reservations where id = p_reservation_id;
  if not found then
    raise exception 'INVOICE_RESERVATION_NOT_FOUND';
  end if;

  if r.business_id is null then
    raise exception 'INVOICE_RESERVATION_NOT_FOUND';
  end if;

  if not public.wavon_can_access_feature(r.business_id, 'invoices') then
    raise exception 'INVOICE_NOT_ALLOWED';
  end if;

  select id into existing_id
  from public.wavon_invoices
  where business_id = r.business_id
    and reservation_id = r.id;
  if existing_id is not null then
    return existing_id;
  end if;

  select * into s from public.wavon_services where id = r.service_id;
  if not found then
    raise exception 'INVOICE_NO_SERVICE';
  end if;

  if coalesce(s.price, 0) <= 0 then
    raise exception 'INVOICE_NO_PRICE';
  end if;

  c_name := null;
  c_email := null;
  c_phone := null;
  if r.client_id is not null then
    select full_name, email, phone into c_name, c_email, c_phone
    from public.wavon_clients
    where id = r.client_id;
  end if;

  if r.client_id is null and length(trim(r.client_name)) = 0 then
    raise exception 'INVOICE_NO_CLIENT';
  end if;

  c_name := coalesce(nullif(trim(r.client_name), ''), nullif(trim(c_name), ''), 'Client');
  c_email := case when r.client_id is not null then nullif(trim(coalesce(c_email, '')), '') else null end;
  c_phone := case when r.client_id is not null then nullif(trim(coalesce(c_phone, '')), '') else null end;

  select * into b from public.wavon_businesses where id = r.business_id;

  v_addr := nullif(
    trim(
      concat_ws(
        E'\n',
        nullif(trim(b.address), ''),
        nullif(trim(concat_ws(' ', nullif(trim(b.postal_code::text), ''), nullif(trim(b.city::text), ''))), '')
      )
    ),
    ''
  );

  -- Couleur primaire : facturation > business public_accent_color
  select * into iset from public.wavon_invoice_settings where business_id = r.business_id;
  v_brand_color := coalesce(
    nullif(trim(coalesce(iset.brand_color, '')), ''),
    nullif(trim(coalesce(b.public_accent_color, '')), ''),
    null
  );

  v_unit := s.price;
  v_total := s.price;

  insert into public.wavon_invoices (
    business_id,
    reservation_id,
    client_id,
    invoice_number,
    status,
    issue_date,
    due_date,
    client_name,
    client_email,
    client_phone,
    client_address,
    reservation_start_at,
    service_name,
    description,
    service_price,
    line_unit_price,
    line_quantity,
    subtotal,
    discount_amount,
    total_amount,
    currency,
    business_name,
    business_address,
    business_email,
    business_phone,
    business_logo_url,
    business_primary_color,
    payment_terms,
    notes
  )
  values (
    r.business_id,
    r.id,
    r.client_id,
    ''::text,
    'draft'::public.wavon_invoice_status,
    (timezone('Europe/Zurich', now()))::date,
    null,
    c_name,
    c_email,
    c_phone,
    null,
    r.start_at,
    coalesce(nullif(trim(s.name), ''), 'Service'),
    nullif(trim(s.description), ''),
    s.price,
    v_unit,
    1,
    v_total,
    0,
    v_total,
    coalesce(nullif(trim(b.currency), ''), 'CHF'),
    nullif(trim(b.business_name::text), ''),
    v_addr,
    nullif(trim(b.email::text), ''),
    nullif(trim(b.phone::text), ''),
    nullif(trim(b.public_logo_url::text), ''),
    v_brand_color,
    coalesce(nullif(trim(iset.payment_terms), ''), 'Paiement à 30 jours'),
    null
  )
  returning id into new_id;

  -- Première ligne (ligne par défaut issue de la prestation)
  insert into public.wavon_invoice_items (invoice_id, position, description, quantity, unit_price, total)
  values (
    new_id,
    0,
    coalesce(nullif(trim(s.name), ''), 'Prestation'),
    1,
    v_unit,
    v_total
  );

  insert into public.wavon_invoice_settings (business_id)
  values (r.business_id)
  on conflict (business_id) do nothing;

  return new_id;
end;
$$;

-- ----------------------------------------------------------
-- RLS items (accessibles seulement via la facture parente du business)
-- ----------------------------------------------------------

alter table public.wavon_invoice_items enable row level security;

drop policy if exists "Wavon invoice items owner select" on public.wavon_invoice_items;
drop policy if exists "Wavon invoice items owner insert" on public.wavon_invoice_items;
drop policy if exists "Wavon invoice items owner update" on public.wavon_invoice_items;
drop policy if exists "Wavon invoice items owner delete" on public.wavon_invoice_items;

create policy "Wavon invoice items owner select"
  on public.wavon_invoice_items
  for select
  using (
    exists (
      select 1
      from public.wavon_invoices inv
      where inv.id = wavon_invoice_items.invoice_id
        and public.wavon_is_business_owner(inv.business_id)
        and public.wavon_can_access_feature(inv.business_id, 'invoices')
    )
  );

create policy "Wavon invoice items owner insert"
  on public.wavon_invoice_items
  for insert
  with check (
    exists (
      select 1
      from public.wavon_invoices inv
      where inv.id = wavon_invoice_items.invoice_id
        and public.wavon_is_business_owner(inv.business_id)
        and public.wavon_can_access_feature(inv.business_id, 'invoices')
    )
  );

create policy "Wavon invoice items owner update"
  on public.wavon_invoice_items
  for update
  using (
    exists (
      select 1
      from public.wavon_invoices inv
      where inv.id = wavon_invoice_items.invoice_id
        and public.wavon_is_business_owner(inv.business_id)
        and public.wavon_can_access_feature(inv.business_id, 'invoices')
    )
  )
  with check (
    exists (
      select 1
      from public.wavon_invoices inv
      where inv.id = wavon_invoice_items.invoice_id
        and public.wavon_is_business_owner(inv.business_id)
        and public.wavon_can_access_feature(inv.business_id, 'invoices')
    )
  );

create policy "Wavon invoice items owner delete"
  on public.wavon_invoice_items
  for delete
  using (
    exists (
      select 1
      from public.wavon_invoices inv
      where inv.id = wavon_invoice_items.invoice_id
        and public.wavon_is_business_owner(inv.business_id)
        and public.wavon_can_access_feature(inv.business_id, 'invoices')
    )
  );

comment on table public.wavon_invoice_items is
  'Lignes de facture (description, quantité, prix unitaire, total). Une facture en a au moins une.';
comment on column public.wavon_invoices.subtotal is
  'Somme des lignes (avant rabais). Maintenu via wavon_recompute_invoice_totals ou côté API.';
comment on column public.wavon_invoices.discount_amount is
  'Rabais global (montant absolu, même devise que la facture).';
comment on column public.wavon_invoices.total_amount is
  'Total final = subtotal - discount_amount (jamais négatif).';

-- ----------------------------------------------------------
-- Numérotation : FAC-AAAA-NNNN (Obillz-like)
-- ----------------------------------------------------------

create or replace function public.wavon_assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (now() at time zone 'UTC'))::int;
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

  new.invoice_number := 'FAC-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

-- Renomme les anciennes factures « WV-AAAA-NNNN » en « FAC-AAAA-NNNN » pour homogénéité.
update public.wavon_invoices
set invoice_number = 'FAC-' || substring(invoice_number from 4)
where invoice_number ~ '^WV-\d{4}-\d{4}$';

