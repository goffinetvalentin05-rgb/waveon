-- Waevon : fin de l’essai gratuit — accès métier uniquement avec abonnement Stripe (actif / past_due / trialing Stripe).

-- 1) Contrainte subscription_status : autoriser inactive
alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_subscription_status_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'inactive',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'trialing',
      'expired'
    )
  );

comment on column public.wavon_businesses.subscription_status is
  'État d’abonnement (Stripe + synchro). inactive = pas d’abonnement payant actif.';

-- 2) Défauts : nouveau commerce = inactif tant que non payé
alter table public.wavon_businesses alter column subscription_status set default 'inactive';
alter table public.wavon_businesses alter column subscription_plan drop default;

-- 3) Nettoyer les fenêtres d’essai historiques (colonnes conservées pour compat)
update public.wavon_businesses
set trial_started_at = null, trial_ends_at = null;

-- 4) Rattrapage : sans abonnement Stripe en base → inactive
update public.wavon_businesses b
set
  subscription_status = 'inactive',
  subscription_plan = case
    when b.subscription_plan = 'trial' then null
    else b.subscription_plan
  end
where
  b.stripe_subscription_id is null
  or length(trim(b.stripe_subscription_id)) = 0;

-- 5) Garde SaaS (RLS) : uniquement abonnement Stripe utilisable
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
  'Accès métier : abonnement Stripe actif, trialing (Stripe) ou past_due.';

-- 6) Inscription : création commerce sans essai gratuit
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
