-- =====================================================================
-- Prono Clash — Stripe : 1 paiement = 1 ligue privée
-- - Ligue créée en pending_payment avant Checkout
-- - Activation idempotente via webhook
-- =====================================================================

-- Renommer stripe_session_id → stripe_checkout_session_id (leagues)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leagues' and column_name = 'stripe_session_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leagues' and column_name = 'stripe_checkout_session_id'
  ) then
    alter table public.leagues rename column stripe_session_id to stripe_checkout_session_id;
  end if;
end $$;

alter table public.leagues
  add column if not exists stripe_payment_intent_id text;

-- invite_code nullable tant que la ligue n'est pas active
alter table public.leagues alter column invite_code drop not null;

-- Statuts métier
alter table public.leagues alter column status set default 'pending_payment';

update public.leagues
set status = 'active'
where slug = 'global' and status is distinct from 'active';

-- Contraintes d'unicité Stripe (1 session = 1 ligue)
create unique index if not exists leagues_stripe_checkout_session_id_uidx
  on public.leagues (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists leagues_stripe_payment_intent_id_uidx
  on public.leagues (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- payments : raw_event + unicité payment_intent
alter table public.payments
  add column if not exists raw_event jsonb;

update public.payments
set raw_event = raw
where raw_event is null and raw is not null;

create unique index if not exists payments_stripe_payment_intent_id_uidx
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Renommer stripe_session_id → stripe_checkout_session_id (payments) si besoin
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'stripe_session_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'stripe_checkout_session_id'
  ) then
    alter table public.payments rename column stripe_session_id to stripe_checkout_session_id;
  end if;
end $$;

create unique index if not exists payments_stripe_checkout_session_id_uidx
  on public.payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
