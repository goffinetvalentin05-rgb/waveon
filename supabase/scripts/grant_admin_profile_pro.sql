-- À exécuter dans Supabase → SQL Editor (une fois la migration 20260424180000_profiles_subscription_overrides appliquée).
-- Accorde un accès Pro « interne » au compte goffinetvalentin05@gmail.com via la table profiles.

-- 1) S’assurer qu’une ligne profiles existe pour l’utilisateur, puis appliquer les overrides.
insert into public.profiles (
  id,
  role,
  plan_override,
  subscription_status_override
)
select
  u.id,
  'admin',
  'pro',
  'active'
from auth.users u
where lower(trim(u.email)) = lower(trim('goffinetvalentin05@gmail.com'))
on conflict (id) do update set
  role = excluded.role,
  plan_override = excluded.plan_override,
  subscription_status_override = excluded.subscription_status_override;
-- Note : si ta table `profiles` possède une colonne `updated_at`, tu peux ajouter :
--   , updated_at = now()
-- à la clause `do update set` ci-dessus.

-- 2) Vérification (optionnel)
-- select p.id, u.email, p.role, p.plan_override, p.subscription_status_override
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where lower(trim(u.email)) = lower(trim('goffinetvalentin05@gmail.com'));
