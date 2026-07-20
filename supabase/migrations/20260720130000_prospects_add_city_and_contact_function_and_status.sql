-- =========================================================
-- Prospection CRM — champs complémentaires + statut optionnel
-- =========================================================

-- Champs demandés pour la fiche détaillée
alter table public.prospects
  add column if not exists ville text,
  add column if not exists contact_function text;

-- Nouveau statut terminal : Pas intéressé
-- (On remplace la contrainte existante pour inclure la nouvelle valeur)
alter table public.prospects drop constraint if exists prospects_status_check;

alter table public.prospects
  add constraint prospects_status_check
  check (
    status in (
      'À contacter',
      'Contacté',
      'Relance 1',
      'Relance 2',
      'Démonstration',
      'Client',
      'Refus',
      'Pas intéressé'
    )
  );

