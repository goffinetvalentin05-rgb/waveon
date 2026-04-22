# TODO (hors scope multi-employés)

- **PowerShell / commits**: prévoir une note projet (ou script) pour échapper les chemins avec parenthèses lors des commandes git.
- **Équipe → assignation services**: la métrique “X services” ignore volontairement les services en mode “Tous les prestataires” (employee_ids = []). Si tu préfères compter “tous”, adapter l’affichage.
- **RLS Storage**: vérifier/ajuster les policies Supabase Storage pour autoriser upload/suppression des photos employés (bucket `wavon-branding`).
- **PublicBookingClient**: l’étape prestataire est intégrée à l’UI existante plutôt qu’un vrai wizard step-by-step (à factoriser si tu veux un vrai stepper).
- **Calendrier**: “Vue par prestataire” en colonnes (jour) non implémentée (react-big-calendar ne le rend pas trivial sans custom layout).

- **Blocage rapide (v1)**: le chemin “clic-drag sur zone vide → menu contextuel (Nouvelle réservation / Bloquer)” n’est pas implémenté. `react-big-calendar` expose `onSelectSlot`, mais l’intégration propre d’un popover contextuel (positionné à la souris, en évitant conflits avec le flow existant) mérite une itération dédiée.
- **Blocage rapide (v2)**: ajouter une gestion de récurrence (ex: tous les mercredis 12h-14h) + UI de duplication/édition en série.
- **PublicBookingClient (lint)**: warning `react-hooks/exhaustive-deps` existant sur un `useEffect` (dépendance `svc`) — à corriger quand tu veux nettoyer les warnings ESLint.

