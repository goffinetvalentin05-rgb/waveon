-- Waevon : statut "expired", garde RLS alignée sur subscription_status, rattrapage des essais terminés.
-- Corrige l’ancienne règle qui autorisait toutes les écritures dès qu’un stripe_subscription_id était présent
-- (même abonnement annulé).

-- 1) Contrainte subscription_status : ajouter expired (garder les valeurs Stripe existantes)
alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_status_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'trialing',
      'active',
      'expired',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete'
    )
  );

comment on column public.wavon_businesses.subscription_status is
  'État d’abonnement Waevon + Stripe : trialing | active | expired | past_due | canceled | unpaid | incomplete.';

-- 2) Essais Waevon réellement terminés (sans abonnement Stripe) → expired
update public.wavon_businesses b
set
  subscription_status = 'expired',
  subscription_plan = coalesce(b.subscription_plan, 'trial')
where
  (
    b.stripe_subscription_id is null
    or length(trim(b.stripe_subscription_id)) = 0
  )
  and coalesce(b.trial_ends_at, b.created_at + interval '7 days') <= now()
  and coalesce(b.subscription_status, 'trialing') in ('trialing');

-- 3) Fonction SaaS : source de vérité = colonnes persistées + fenêtre d’essai
create or replace function public.wavon_business_saas_allowed(p_business_id uuid)
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
          when b.stripe_subscription_id is not null and length(trim(b.stripe_subscription_id)) > 0 then
            coalesce(b.subscription_status, '') in ('active', 'trialing', 'past_due')
          else
            coalesce(b.subscription_status, 'trialing') = 'trialing'
            and coalesce(b.trial_ends_at, b.created_at + interval '7 days') > now()
        end
      from public.wavon_businesses b
      where b.id = p_business_id
    ),
    false
  );
$$;

comment on function public.wavon_business_saas_allowed(uuid) is
  'Accès métier : abonnement Stripe actif/essai Stripe/en retard de paiement, ou essai Waevon trialing non expiré.';
