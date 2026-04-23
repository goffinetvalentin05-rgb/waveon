-- ==========================================================
-- Waevon : ensure colonnes trial/abonnement existent (prod drift safe)
-- But : rendre l'init trial robuste même si certaines migrations
--       (subscription_status / subscription_plan) n'ont pas été appliquées.
-- ==========================================================

-- 1) Colonnes nécessaires (idempotent)
alter table public.wavon_businesses
  add column if not exists trial_started_at timestamptz;

alter table public.wavon_businesses
  add column if not exists trial_ends_at timestamptz;

alter table public.wavon_businesses
  add column if not exists subscription_status text;

alter table public.wavon_businesses
  add column if not exists subscription_plan text;

comment on column public.wavon_businesses.trial_started_at is
  'Début de l’essai gratuit Waevon (7 jours, sans carte).';

comment on column public.wavon_businesses.trial_ends_at is
  'Fin de l’essai gratuit Waevon (7 jours à l’inscription, sans Stripe).';

comment on column public.wavon_businesses.subscription_status is
  'État d’abonnement : trialing | active | past_due | canceled | unpaid | incomplete | trial_expired (Waevon).';

comment on column public.wavon_businesses.subscription_plan is
  'Plan SaaS : trial | starter | pro.';

-- 2) Defaults SQL (source de vérité en base)
alter table public.wavon_businesses
  alter column trial_started_at set default now();

alter table public.wavon_businesses
  alter column trial_ends_at set default (now() + interval '7 days');

alter table public.wavon_businesses
  alter column subscription_status set default 'trialing';

-- Contrainte plan : accepter trial/starter/pro (idempotent via drop)
alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_plan_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_plan_check
  check (
    subscription_plan is null
    or subscription_plan in ('trial', 'starter', 'pro')
  );

alter table public.wavon_businesses
  alter column subscription_plan set default 'trial';

-- 3) Trigger auth.users : init trial en dur (ne touche pas Stripe)
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
    trial_started_at,
    trial_ends_at,
    subscription_status,
    subscription_plan
  )
  values (
    new.id,
    v_slug,
    now(),
    now() + interval '7 days',
    'trialing',
    'trial'
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

  -- Employé par défaut (si le schéma multi-employés est présent)
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

  -- Email settings (best-effort)
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

-- 4) Rattrapage : remet un trial valide si cassé/manquant
update public.wavon_businesses
set
  trial_started_at = coalesce(trial_started_at, now()),
  trial_ends_at = case
    when trial_ends_at is null then now() + interval '7 days'
    when subscription_status = 'trialing' and trial_ends_at < now() then now() + interval '7 days'
    else trial_ends_at
  end,
  subscription_status = coalesce(subscription_status, 'trialing'),
  subscription_plan = coalesce(subscription_plan, 'trial')
where
  trial_ends_at is null
  or subscription_status is null
  or (subscription_status = 'trialing' and trial_ends_at < now());

