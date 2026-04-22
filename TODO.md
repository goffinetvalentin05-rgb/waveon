# Stripe / facturation — notes techniques

- **Préfixe SQL des tables** : toujours **`wavon_*`** (sans « e ») dans ce dépôt et sur la prod. Le code ne doit pas cibler `waevon_businesses` : cette orthographe ne correspond pas aux tables Supabase. Erreur **PGRST205** / table introuvable → vérifier que le client utilise bien `wavon_*`. Erreur **42703** = colonne absente → migration Stripe (`wavon_businesses`) non appliquée.
- **API Stripe récente (SDK 22 / `2026-03-25.dahlia`)** : `current_period_end` n’est plus sur l’objet `Subscription` racine ; la fin de période est lue sur `subscription.items.data[0].current_period_end`. Les factures d’abonnement exposent l’ID d’abonnement sous `invoice.parent.subscription_details.subscription`, pas un champ `subscription` racine sur `Invoice`.
- **Stripe sans webhooks** : l’état d’abonnement est lu via l’API Stripe à la demande (voir `lib/stripe/subscription.ts`).
- **Statut `paused` (Stripe)** : mappé en base sur `active` faute de valeur dans la contrainte CHECK SQL — à affiner si tu veux un statut dédié.
- **Portail client** : à activer et configurer dans le Dashboard Stripe (produits, annulation, etc.) pour que `/api/stripe/portal` fonctionne en production.
