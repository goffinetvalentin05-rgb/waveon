# TODO (hors scope multi-employés)

- **PowerShell / commits**: prévoir une note projet (ou script) pour échapper les chemins avec parenthèses lors des commandes git.
- **Équipe → assignation services**: la métrique “X services” ignore volontairement les services en mode “Tous les prestataires” (employee_ids = []). Si tu préfères compter “tous”, adapter l’affichage.
- **RLS Storage**: vérifier/ajuster les policies Supabase Storage pour autoriser upload/suppression des photos employés (bucket `wavon-branding`).
- **PublicBookingClient**: l’étape prestataire est intégrée à l’UI existante plutôt qu’un vrai wizard step-by-step (à factoriser si tu veux un vrai stepper).
- **Calendrier**: “Vue par prestataire” en colonnes (jour) non implémentée (react-big-calendar ne le rend pas trivial sans custom layout).

