-- Factures : snapshot commercial sur la ligne (PDF stable), totaux, échéance, réservation optionnelle.

alter table public.wavon_invoices
  add column if not exists due_date date;

alter table public.wavon_invoices
  add column if not exists line_unit_price int not null default 0;

alter table public.wavon_invoices
  add column if not exists total_amount int not null default 0;

alter table public.wavon_invoices
  add column if not exists business_name text;

alter table public.wavon_invoices
  add column if not exists business_address text;

alter table public.wavon_invoices
  add column if not exists business_email text;

alter table public.wavon_invoices
  add column if not exists business_phone text;

alter table public.wavon_invoices
  add column if not exists business_logo_url text;

-- Historique : une ligne, quantité 1 (ancien modèle)
update public.wavon_invoices
set
  line_unit_price = service_price,
  total_amount = service_price
where total_amount = 0 or line_unit_price = 0;

do $$ begin
  alter table public.wavon_invoices add constraint wavon_invoices_line_unit_non_negative check (line_unit_price >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.wavon_invoices add constraint wavon_invoices_total_non_negative check (total_amount >= 0);
exception when duplicate_object then null;
end $$;

-- Réservation future sans lien (brouillons) : autorisé
alter table public.wavon_invoices
  alter column reservation_id drop not null;

-- ----------------------------------------------------------
-- RPC : remplit snapshot + totaux
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
  c_name text;
  c_email text;
  c_phone text;
  v_addr text;
  existing_id uuid;
  new_id uuid;
  v_line_qty numeric(12, 2) := 1;
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
    reservation_start_at,
    service_name,
    description,
    service_price,
    line_unit_price,
    line_quantity,
    total_amount,
    currency,
    business_name,
    business_address,
    business_email,
    business_phone,
    business_logo_url
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
    r.start_at,
    coalesce(nullif(trim(s.name), ''), 'Service'),
    nullif(trim(s.description), ''),
    s.price,
    v_unit,
    v_line_qty,
    v_total,
    coalesce(nullif(trim(b.currency), ''), 'CHF'),
    nullif(trim(b.business_name::text), ''),
    v_addr,
    nullif(trim(b.email::text), ''),
    nullif(trim(b.phone::text), ''),
    nullif(trim(b.public_logo_url::text), '')
  )
  returning id into new_id;

  insert into public.wavon_invoice_settings (business_id)
  values (r.business_id)
  on conflict (business_id) do nothing;

  return new_id;
end;
$$;

comment on table public.wavon_invoices is
  'Ligne facture : client_*, business_* = snapshot; total_amount/line_unit_price = ligne unique courante.';
