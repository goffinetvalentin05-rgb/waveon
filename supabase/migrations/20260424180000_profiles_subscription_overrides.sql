-- Overrides d’abonnement côté profil (interne / partenaires) — ne remplace pas Stripe pour les clients normaux.
-- Utilisé par l’app pour traiter role = admin ou plan_override = pro comme un plan Pro actif.

alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists plan_override text,
  add column if not exists subscription_status_override text;

comment on column public.profiles.role is 'user | admin (accès interne)';
comment on column public.profiles.plan_override is 'ex. pro — force les capacités Pro sans Stripe';
comment on column public.profiles.subscription_status_override is 'ex. active — informatif pour l’UI / audits';
