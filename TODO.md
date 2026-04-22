# Stripe / facturation — notes techniques

- **API Stripe récente (SDK 22 / `2026-03-25.dahlia`)** : `current_period_end` n’est plus sur l’objet `Subscription` racine ; la fin de période est lue sur `subscription.items.data[0].current_period_end`. Les factures d’abonnement exposent l’ID d’abonnement sous `invoice.parent.subscription_details.subscription`, pas un champ `subscription` racine sur `Invoice`.
- **Webhooks** : après vérification de la signature, les erreurs de traitement sont loguées mais la route répond **200** pour éviter des boucles de retry Stripe sur erreurs métier (choix explicite du cahier des charges).
- **Statut `paused` (Stripe)** : mappé en base sur `active` faute de valeur dans la contrainte CHECK SQL — à affiner si tu veux un statut dédié.
- **Portail client** : à activer et configurer dans le Dashboard Stripe (produits, annulation, etc.) pour que `/api/stripe/portal` fonctionne en production.
