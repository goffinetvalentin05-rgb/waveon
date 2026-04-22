-- Retrait des colonnes de cache d’abonnement (état lu en direct via l’API Stripe).
-- Conserver uniquement stripe_customer_id et stripe_subscription_id.

DO $body$
BEGIN
  IF to_regclass('public.wavon_businesses') IS NOT NULL THEN
    ALTER TABLE public.wavon_businesses
      DROP COLUMN IF EXISTS subscription_status,
      DROP COLUMN IF EXISTS subscription_plan,
      DROP COLUMN IF EXISTS trial_ends_at,
      DROP COLUMN IF EXISTS current_period_end,
      DROP COLUMN IF EXISTS cancel_at_period_end;
  END IF;
END $body$;
