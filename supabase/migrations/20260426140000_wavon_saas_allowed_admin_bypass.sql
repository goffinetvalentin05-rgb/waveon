-- RLS : aligner la garde `wavon_business_saas_allowed` sur l’app
-- (essai profils, Stripe, compte test interne, overrides profil admin / pro).
-- Sans cela, l’UI autorise l’écriture (résolution abonnement côté API) mais l’insert Supabase est rejeté.

create or replace function public.wavon_business_saas_allowed(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      (
        b.stripe_subscription_id is not null
        and length(trim(b.stripe_subscription_id::text)) > 0
        and coalesce(b.subscription_status, '') in ('active', 'trialing', 'past_due')
      )
      or (
        p.trial_end is not null
        and p.trial_end > now()
        and p.subscription_status = 'trialing'
      )
      or (
        u.email is not null
        and lower(trim(u.email::text)) = 'goffinetvalentin05@gmail.com'
      )
      or (
        lower(trim(coalesce(p.role, ''))) = 'admin'
        or lower(trim(coalesce(p.plan_override, ''))) = 'pro'
      )
    from public.wavon_businesses b
    left join public.profiles p on p.id = b.user_id
    left join auth.users u on u.id = b.user_id
    where b.id = p_business_id
  ), false);
$$;

comment on function public.wavon_business_saas_allowed(uuid) is
  'True si Stripe actif, essai 7j (profiles), compte test interne (email), ou override profil admin/pro.';

revoke all on function public.wavon_business_saas_allowed(uuid) from public;
grant execute on function public.wavon_business_saas_allowed(uuid) to postgres, service_role, authenticated, anon;
