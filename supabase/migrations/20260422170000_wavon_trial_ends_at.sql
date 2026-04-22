-- Essai gratuit Waevon (7 jours, sans carte, sans Stripe) : date de fin sur chaque business.

ALTER TABLE public.wavon_businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

COMMENT ON COLUMN public.wavon_businesses.trial_ends_at IS
  'Fin de l’essai gratuit Waevon (7 jours à l’inscription, sans Stripe).';

-- Nouvelles lignes : 7 jours par défaut (trigger + insert applicatif peuvent surcharger).
ALTER TABLE public.wavon_businesses
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

-- Comptes existants sans date : created_at + 7 jours (déjà dépassé = bloqués tant qu’ils n’ont pas souscrit).
UPDATE public.wavon_businesses
SET trial_ends_at = created_at + interval '7 days'
WHERE trial_ends_at IS NULL;

-- Création de compte : essai aligné sur l’inscription auth.
CREATE OR REPLACE FUNCTION public.wavon_init_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_slug text;
BEGIN
  v_slug := 'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);

  INSERT INTO public.wavon_businesses (user_id, public_slug, trial_ends_at)
  VALUES (new.id, v_slug, now() + interval '7 days')
  ON CONFLICT (user_id) DO UPDATE SET user_id = excluded.user_id
  RETURNING id INTO v_business_id;

  INSERT INTO public.wavon_settings (business_id)
  VALUES (v_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  INSERT INTO public.wavon_email_templates (business_id, type, is_enabled, subject, body)
  VALUES
    (v_business_id, 'confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    (v_business_id, 'reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    (v_business_id, 'cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
  ON CONFLICT (business_id, type) DO NOTHING;

  INSERT INTO public.wavon_availability_rules (business_id, day_of_week, is_open, segments)
  SELECT v_business_id, d, false, '[]'::jsonb
  FROM generate_series(0, 6) AS d
  ON CONFLICT (business_id, day_of_week) DO NOTHING;

  BEGIN
    INSERT INTO public.wavon_email_settings (business_id, type, enabled, delay_hours, subject, body, custom_links)
    VALUES
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
    ON CONFLICT (business_id, type) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  return new;
end;
$$;
