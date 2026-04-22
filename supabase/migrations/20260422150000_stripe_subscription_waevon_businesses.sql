-- Colonnes Stripe sur `waevon_businesses` si cette table existe (prod renommée).
-- Les migrations précédentes ciblent `wavon_businesses` ; idempotent.

DO $$
DECLARE
  has_waevon boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'waevon_businesses'
  )
  INTO has_waevon;

  IF NOT has_waevon THEN
    RETURN;
  END IF;

  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS stripe_customer_id text;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS subscription_status text;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS subscription_plan text;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
  ALTER TABLE public.waevon_businesses
    ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

  COMMENT ON COLUMN public.waevon_businesses.stripe_customer_id IS 'Stripe Customer id (cus_...)';
  COMMENT ON COLUMN public.waevon_businesses.stripe_subscription_id IS 'Stripe Subscription id active (sub_...)';
  COMMENT ON COLUMN public.waevon_businesses.subscription_status IS
    'Stripe subscription status: trialing | active | past_due | canceled | unpaid | incomplete';
  COMMENT ON COLUMN public.waevon_businesses.subscription_plan IS 'Plan SaaS: starter | pro';
  COMMENT ON COLUMN public.waevon_businesses.trial_ends_at IS 'Fin période d''essai (Stripe trial_end)';
  COMMENT ON COLUMN public.waevon_businesses.current_period_end IS 'Fin de période de facturation en cours';
  COMMENT ON COLUMN public.waevon_businesses.cancel_at_period_end IS 'Résiliation demandée en fin de période';

  ALTER TABLE public.waevon_businesses
    DROP CONSTRAINT IF EXISTS waevon_businesses_subscription_status_check;
  ALTER TABLE public.waevon_businesses
    ADD CONSTRAINT waevon_businesses_subscription_status_check
    CHECK (
      subscription_status IS NULL
      OR subscription_status IN (
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete'
      )
    );

  ALTER TABLE public.waevon_businesses
    DROP CONSTRAINT IF EXISTS waevon_businesses_subscription_plan_check;
  ALTER TABLE public.waevon_businesses
    ADD CONSTRAINT waevon_businesses_subscription_plan_check
    CHECK (
      subscription_plan IS NULL
      OR subscription_plan IN ('starter', 'pro')
    );

  CREATE INDEX IF NOT EXISTS waevon_businesses_stripe_customer_id_idx
    ON public.waevon_businesses (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS waevon_businesses_stripe_subscription_id_idx
    ON public.waevon_businesses (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;
END $$;
