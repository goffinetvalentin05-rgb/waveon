-- Waevon : informations bancaires sur les factures et leur paramétrage par défaut.
-- Objectifs :
--   - Ajouter IBAN / titulaire / banque sur `wavon_invoices` et `wavon_invoice_settings`
--   - À la création d'une facture, recopier ces infos depuis les paramètres (modifiables ensuite)
--   - Conserver `payment_terms` côté facture en repli sur les paramètres

-- ----------------------------------------------------------
-- Colonnes facture
-- ----------------------------------------------------------

alter table public.wavon_invoices
  add column if not exists payment_iban text;

alter table public.wavon_invoices
  add column if not exists payment_account_holder text;

alter table public.wavon_invoices
  add column if not exists payment_bank_name text;

-- ----------------------------------------------------------
-- Colonnes paramétrage facturation (valeurs par défaut)
-- ----------------------------------------------------------

alter table public.wavon_invoice_settings
  add column if not exists payment_iban text;

alter table public.wavon_invoice_settings
  add column if not exists payment_account_holder text;

alter table public.wavon_invoice_settings
  add column if not exists payment_bank_name text;

-- ----------------------------------------------------------
-- RPC : création depuis réservation — recopie aussi les infos bancaires
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
    payment_iban,
    payment_account_holder,
    payment_bank_name,
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
    nullif(trim(coalesce(iset.payment_iban, '')), ''),
    coalesce(
      nullif(trim(coalesce(iset.payment_account_holder, '')), ''),
      nullif(trim(b.business_name::text), '')
    ),
    nullif(trim(coalesce(iset.payment_bank_name, '')), ''),
    null
  )
  returning id into new_id;

  -- Première ligne (issue de la prestation)
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

comment on column public.wavon_invoices.payment_iban is
  'IBAN affiché sur la facture (snapshot ; modifiable par facture).';
comment on column public.wavon_invoices.payment_account_holder is
  'Titulaire du compte affiché sur la facture.';
comment on column public.wavon_invoices.payment_bank_name is
  'Nom de la banque affiché sur la facture.';
