-- ==========================================================
-- Waevon : fix inscription (trigger auth.users)
-- - Garantit un essai gratuit de 7 jours (trial_ends_at)
-- - Compatible multi-employés : crée un employé par défaut + horaires avec employee_id
-- - Rattrapage "safe" : corrige trial_ends_at uniquement si NULL ou incohérent vs created_at
-- ==========================================================

-- Par sécurité : default en base (si insertion hors trigger)
alter table public.wavon_businesses
  alter column trial_ends_at set default (now() + interval '7 days');

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
  -- slug public stable (évite null + unique)
  v_slug := 'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);

  -- Business + essai Waevon
  insert into public.wavon_businesses (user_id, public_slug, trial_ends_at)
  values (new.id, v_slug, now() + interval '7 days')
  on conflict (user_id) do update
    set user_id = excluded.user_id
  returning id into v_business_id;

  -- Settings (1 ligne par business)
  insert into public.wavon_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  -- Email templates par défaut (best-effort)
  insert into public.wavon_email_templates (business_id, type, is_enabled, subject, body)
  values
    (v_business_id, 'confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    (v_business_id, 'reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    (v_business_id, 'cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
  on conflict (business_id, type) do nothing;

  -- Employé par défaut (nécessaire pour les contraintes employee_id non null via CHECK)
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

  -- 7 règles hebdo (toutes fermées par défaut) AVEC employee_id (multi-employés)
  insert into public.wavon_availability_rules (business_id, employee_id, day_of_week, is_open, segments)
  select v_business_id, v_employee_id, d, false, '[]'::jsonb
  from generate_series(0, 6) as d
  on conflict (business_id, employee_id, day_of_week) do nothing;

  -- Email settings configurables (si la table/type existe)
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

-- ==========================================================
-- Rattrapage "safe" : trial_ends_at manquant ou incohérent
-- - Ne touche PAS aux comptes réellement expirés (trial_ends_at cohérent).
-- - Corrige uniquement si NULL ou antérieur à created_at (valeur clairement cassée).
-- ==========================================================
update public.wavon_businesses
set trial_ends_at = created_at + interval '7 days'
where (stripe_subscription_id is null or btrim(stripe_subscription_id) = '')
  and (trial_ends_at is null or trial_ends_at < created_at);

