-- Waevon : mode découverte sans essai gratuit Waevon.
-- - Accès lecture (RLS SELECT) inchangé pour le propriétaire.
-- - Écritures métier : uniquement abonnement Stripe utilisable (active / trialing Stripe / past_due).
-- - Fin des colonnes d’essai côté produit : trigger d’inscription sans trial ; rattrapage des lignes existantes.

-- 1) Plan : ne plus autoriser la valeur « trial »
alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_plan_check;

update public.wavon_businesses
set subscription_plan = null
where coalesce(subscription_plan, '') = 'trial';

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_plan_check
  check (
    subscription_plan is null
    or subscription_plan in ('starter', 'pro')
  );

comment on column public.wavon_businesses.trial_started_at is
  'Obsolète (non utilisé par le produit).';

comment on column public.wavon_businesses.trial_ends_at is
  'Obsolète (non utilisé par le produit).';

-- 2) Comptes sans abonnement Stripe : statut cohérent « inactive » (hors vrais essais Stripe déjà liés)
update public.wavon_businesses b
set subscription_status = 'inactive'
where
  (
    b.stripe_subscription_id is null
    or length(trim(b.stripe_subscription_id)) = 0
  )
  and coalesce(b.subscription_status, '') in ('trialing', 'expired');

-- 3) Nettoyage des dates d’essai Waevon
update public.wavon_businesses
set
  trial_started_at = null,
  trial_ends_at = null;

-- 4) Garde SaaS (écritures RLS) : uniquement abonnement Stripe
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
        b.stripe_subscription_id is not null
        and length(trim(b.stripe_subscription_id)) > 0
        and coalesce(b.subscription_status, '') in ('active', 'trialing', 'past_due')
      from public.wavon_businesses b
      where b.id = p_business_id
    ),
    false
  );
$$;

comment on function public.wavon_business_saas_allowed(uuid) is
  'Écritures métier autorisées si abonnement Stripe actif, en essai Stripe ou en retard de paiement.';

-- 5) Inscription : plus d’essai Waevon (découverte UI + paiement pour l’usage métier)
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
begin
  v_slug := 'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);

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
