-- Essai gratuit 7 jours (profils) + RLS : écritures autorisées si abonnement Stripe actif
-- ou période d’essai valide (profiles.trial_end > now, subscription_status = trialing).
-- La fonction wavon_business_saas_allowed est en SECURITY DEFINER pour lire profiles
-- lors des policies exécutées en tant qu’utilisateur anonyme (réservation publique).

-- 1) Colonnes `profiles`
alter table public.profiles
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists plan text not null default 'starter',
  add column if not exists subscription_status text not null default 'expired';

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'expired'));

comment on column public.profiles.trial_start is 'Début essai gratuit Waevon (7 j).';
comment on column public.profiles.trial_end is 'Fin essai gratuit Waevon.';
comment on column public.profiles.plan is 'Plan affiché / par défaut (starter, pro).';
comment on column public.profiles.subscription_status is 'Statut côté profil: trialing, active (payant), expired.';

-- 2) Rattrapage : comptes existants = pas d’essai
update public.profiles
set
  trial_start = null,
  trial_end = null,
  subscription_status = 'expired',
  plan = case when coalesce(nullif(trim(plan), ''), '') = '' then 'starter' else plan end
where trial_start is null;

-- Lignes manquantes : une ligne `profiles` par utilisateur (pour jointures RLS)
insert into public.profiles (id, subscription_status, plan)
select u.id, 'expired', 'starter'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 3) Garde RLS
create or replace function public.wavon_business_saas_allowed(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      -- Abonnement Stripe enregistré (table businesses)
      select
        b.stripe_subscription_id is not null
        and length(trim(b.stripe_subscription_id)) > 0
        and coalesce(b.subscription_status, '') in ('active', 'trialing', 'past_due')
      from public.wavon_businesses b
      where b.id = p_business_id
    )
    or
    (
      -- Essai Waevon 7 j. (table profiles)
      select
        p.trial_end is not null
        and p.trial_end > now()
        and p.subscription_status = 'trialing'
      from public.wavon_businesses b
      inner join public.profiles p on p.id = b.user_id
      where b.id = p_business_id
    )
  , false);
$$;

comment on function public.wavon_business_saas_allowed(uuid) is
  'True si abonnement Stripe actif/essai Stripe/past_due, ou essai Waevon (profiles) encore valide.';

revoke all on function public.wavon_business_saas_allowed(uuid) from public;
grant execute on function public.wavon_business_saas_allowed(uuid) to postgres, service_role, authenticated, anon;

-- 4) Inscription : profil + essai
create or replace function public.wavon_init_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_employee_id uuid;
  v_slug text;
  v_trial_start timestamptz := (timezone('utc', now()));
  v_trial_end timestamptz := (timezone('utc', now()) + interval '7 days');
begin
  v_slug := 'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);

  insert into public.profiles (id, trial_start, trial_end, subscription_status, plan)
  values (new.id, v_trial_start, v_trial_end, 'trialing', 'starter')
  on conflict (id) do update set
    trial_start = coalesce(public.profiles.trial_start, excluded.trial_start),
    trial_end = case
      when public.profiles.trial_start is null then excluded.trial_end
      else public.profiles.trial_end
    end,
    subscription_status = case
      when public.profiles.trial_start is null
        and public.profiles.subscription_status = 'expired' then 'trialing'
      else public.profiles.subscription_status
    end,
    plan = case when public.profiles.plan is null or public.profiles.plan = '' then 'starter' else public.profiles.plan end;

  insert into public.wavon_businesses (
    user_id,
    public_slug,
    subscription_status,
    subscription_plan
  )
  values (
    new.id,
    v_slug,
    'inactive',
    null
  )
  on conflict (user_id) do update
    set user_id = excluded.user_id
  returning id into v_business_id;

  insert into public.wavon_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  insert into public.wavon_email_templates (business_id, type, is_enabled, subject, body)
  values
    (v_business_id, 'confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    (v_business_id, 'reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    (v_business_id, 'cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
  on conflict (business_id, type) do nothing;

  begin
    select e.id
      into v_employee_id
    from public.wavon_employees e
    where e.business_id = v_business_id
    order by e.display_order asc, e.created_at asc
    limit 1;

    if v_employee_id is null then
      insert into public.wavon_employees (business_id, name, color, is_active, display_order)
      values (v_business_id, 'Moi', '#0a0a0a', true, 0)
      returning id into v_employee_id;
    end if;

    insert into public.wavon_availability_rules (business_id, employee_id, day_of_week, is_open, segments)
    select v_business_id, v_employee_id, d, false, '[]'::jsonb
    from generate_series(0, 6) as d
    on conflict (business_id, employee_id, day_of_week) do nothing;
  exception
    when undefined_table then null;
    when undefined_column then null;
    when others then null;
  end;

  begin
    insert into public.wavon_email_settings (business_id, type, enabled, delay_hours, subject, body, custom_links)
    values
      (v_business_id, 'reminder_before'::public.wavon_email_setting_type, true, 24,
        'Rappel de votre rendez-vous chez {{business_name}}',
        'Bonjour {{client_name}},\n\nPetit rappel : {{service_name}} le {{reservation_date}} à {{reservation_time}}.\n\nÀ bientôt,\n{{business_name}}',
        '{}'::jsonb
      ),
      (v_business_id, 'post_service'::public.wavon_email_setting_type, true, 2,
        'Merci pour votre visite chez {{business_name}}',
        'Bonjour {{client_name}},\n\nMerci pour votre venue.\n\nSi vous avez 30 secondes, un avis nous aide énormément :',
        jsonb_build_object(
          'google_review', '',
          'instagram', '',
          'tiktok', '',
          'website', '',
          'other_label', '',
          'other_url', ''
        )
      )
    on conflict (business_id, type) do nothing;
  exception
    when undefined_table then null;
    when undefined_object then null;
    when others then null;
  end;

  return new;
end;
$$;
