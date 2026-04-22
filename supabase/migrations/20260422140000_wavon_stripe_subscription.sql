-- Waevon — champs d'abonnement Stripe sur wavon_businesses
-- Idempotent : colonnes IF NOT EXISTS, index IF NOT EXISTS, contraintes recréées proprement.

alter table public.wavon_businesses
  add column if not exists stripe_customer_id text;

alter table public.wavon_businesses
  add column if not exists stripe_subscription_id text;

alter table public.wavon_businesses
  add column if not exists subscription_status text;

alter table public.wavon_businesses
  add column if not exists subscription_plan text;

alter table public.wavon_businesses
  add column if not exists trial_ends_at timestamptz;

alter table public.wavon_businesses
  add column if not exists current_period_end timestamptz;

alter table public.wavon_businesses
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.wavon_businesses.stripe_customer_id is 'Stripe Customer id (cus_...)';
comment on column public.wavon_businesses.stripe_subscription_id is 'Stripe Subscription id active (sub_...)';
comment on column public.wavon_businesses.subscription_status is
  'Stripe subscription status: trialing | active | past_due | canceled | unpaid | incomplete';
comment on column public.wavon_businesses.subscription_plan is 'Plan SaaS: starter | pro';
comment on column public.wavon_businesses.trial_ends_at is 'Fin période d''essai (Stripe trial_end)';
comment on column public.wavon_businesses.current_period_end is 'Fin de période de facturation en cours';
comment on column public.wavon_businesses.cancel_at_period_end is 'Résiliation demandée en fin de période';

alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_status_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete'
    )
  );

alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_plan_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_plan_check
  check (
    subscription_plan is null
    or subscription_plan in ('starter', 'pro')
  );

create index if not exists wavon_businesses_stripe_customer_id_idx
  on public.wavon_businesses (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists wavon_businesses_stripe_subscription_id_idx
  on public.wavon_businesses (stripe_subscription_id)
  where stripe_subscription_id is not null;
