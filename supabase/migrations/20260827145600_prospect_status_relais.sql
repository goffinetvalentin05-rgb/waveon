-- Ajoute le statut Relais au pipeline, sans modifier les données existantes.

alter table public.prospects drop constraint if exists prospects_status_check;

alter table public.prospects
  add constraint prospects_status_check
  check (status in (
    'À contacter',
    'Relance 1',
    'Relance 2',
    'Relais',
    'En discussion',
    'Démo',
    'Client',
    'Fermé'
  ));
