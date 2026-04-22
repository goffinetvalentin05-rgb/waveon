-- Historique : cette migration ciblait une variante de nom de table qui n’est pas utilisée.
-- Toutes les tables métier sont `wavon_*` ; les colonnes Stripe sur `wavon_businesses`
-- sont gérées par `20260422140000_wavon_stripe_subscription.sql`.
-- Conservée pour les déploiements qui l’ont déjà appliquée ; aucune action sur la base.
DO $noop$
BEGIN
  NULL;
END $noop$;
