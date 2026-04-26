-- Factures : compteur RLS (trigger) + accès Pro aligné sur l'app (Stripe Pro, compte test, profils).
-- Résout l'échec silencieux « Impossible de créer la facture » lors de l'insert (trigger sur wavon_invoice_counters).

-- ----------------------------------------------------------
-- Accès factures (équivalent canUseInvoices côté produit)
-- ----------------------------------------------------------

create or replace function public.wavon_can_access_invoices(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      (u.email is not null and lower(trim(u.email::text)) = 'goffinetvalentin05@gmail.com')
      or (lower(trim(coalesce(p.role, ''))) = 'admin')
      or (lower(trim(coalesce(p.plan_override, ''))) = 'pro')
      or (
        coalesce(b.subscription_plan, '') = 'pro'
        and coalesce(b.subscription_status, '') in ('active', 'trialing', 'past_due')
        and b.stripe_subscription_id is not null
        and length(trim(b.stripe_subscription_id::text)) > 0
      )
    from public.wavon_businesses b
    left join public.profiles p on p.id = b.user_id
    left join auth.users u on u.id = b.user_id
    where b.id = p_business_id
  ), false);
$$;

comment on function public.wavon_can_access_invoices(uuid) is
  'Pro via Stripe, compte test email, ou profil admin / plan_override pro — aligné API requireProInvoices.';

revoke all on function public.wavon_can_access_invoices(uuid) from public;
grant execute on function public.wavon_can_access_invoices(uuid) to postgres, service_role, authenticated, anon;

create or replace function public.wavon_can_access_feature(
  p_business_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_feature = 'invoices' then public.wavon_can_access_invoices(p_business_id)
      else coalesce((
        select
          coalesce(b.subscription_status, '') in ('active', 'past_due')
        from public.wavon_businesses b
        where b.id = p_business_id
      ), false)
    end;
$$;

comment on function public.wavon_can_access_feature(uuid, text) is
  'invoices => wavon_can_access_invoices ; autre (legacy) => statut abonnement actif/past_due.';

-- ----------------------------------------------------------
-- Numérotation : le trigger doit bypasser RLS sur les compteurs
-- Format : WV-AAAA-NNNN
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

  new.invoice_number := 'WV-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

-- ----------------------------------------------------------
-- Colonnes optionnelles facture / paramètres PDF
-- ----------------------------------------------------------

alter table public.wavon_invoices
  add column if not exists client_id uuid references public.wavon_clients(id) on delete set null;

alter table public.wavon_invoices
  add column if not exists issue_date date;

alter table public.wavon_invoices
  add column if not exists description text;

alter table public.wavon_invoices
  add column if not exists notes text;

alter table public.wavon_invoices
  add column if not exists line_quantity numeric(12, 2) not null default 1;

update public.wavon_invoices
set issue_date = coalesce(issue_date, (created_at at time zone 'UTC')::date)
where issue_date is null;

alter table public.wavon_invoices
  alter column issue_date set default (timezone('UTC', now()))::date;

alter table public.wavon_invoices
  alter column issue_date set not null;

alter table public.wavon_invoice_settings
  add column if not exists company_phone text;

alter table public.wavon_invoice_settings
  add column if not exists brand_color text;

alter table public.wavon_invoice_settings
  add column if not exists legal_footer text;

-- ----------------------------------------------------------
-- Génération depuis réservation (validations + champs)
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
  existing_id uuid;
  new_id uuid;
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

  insert into public.wavon_invoices (
    business_id,
    reservation_id,
    client_id,
    invoice_number,
    status,
    issue_date,
    client_name,
    client_email,
    client_phone,
    reservation_start_at,
    service_name,
    description,
    service_price,
    line_quantity,
    currency
  )
  values (
    r.business_id,
    r.id,
    r.client_id,
    ''::text,
    'draft'::public.wavon_invoice_status,
    (timezone('Europe/Zurich', now()))::date,
    c_name,
    c_email,
    c_phone,
    r.start_at,
    coalesce(nullif(trim(s.name), ''), 'Service'),
    nullif(trim(s.description), ''),
    s.price,
    1,
    coalesce(nullif(trim(b.currency), ''), 'CHF')
  )
  returning id into new_id;

  insert into public.wavon_invoice_settings (business_id)
  values (r.business_id)
  on conflict (business_id) do nothing;

  return new_id;
end;
$$;
