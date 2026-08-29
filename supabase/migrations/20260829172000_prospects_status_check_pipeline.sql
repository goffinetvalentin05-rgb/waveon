-- Aligne prospects_status_check sur le pipeline CRM actuel (avec Relais).
-- Normalise d'abord les anciens statuts encore présents en base.
-- Aucune suppression de lignes.

alter table public.prospects
  add column if not exists legacy_status text;

alter table public.prospects drop constraint if exists prospects_status_check;

-- Conservatoire : mémoriser les valeurs hors pipeline actuel
update public.prospects
set legacy_status = status
where legacy_status is null
  and status is not null
  and status not in (
    'À contacter',
    'Relance 1',
    'Relance 2',
    'Relais',
    'En discussion',
    'Démo',
    'Client',
    'Fermé'
  );

-- Fermetures legacy → closed_reason
update public.prospects
set
  closed_reason = case status
    when 'Pas intéressé' then 'Pas intéressé'
    when 'Refusé' then 'Pas intéressé'
    when 'Refus' then 'Pas intéressé'
    when 'Pas maintenant' then 'Pas le bon moment'
    when 'Perdu' then 'Autre'
    else closed_reason
  end,
  closed_note = case
    when status = 'Perdu' and (closed_note is null or closed_note = '') then 'Perdu'
    else closed_note
  end
where status in ('Pas intéressé', 'Refusé', 'Refus', 'Pas maintenant', 'Perdu');

-- Mapping connu (aligné sur lib/crm/status.ts)
update public.prospects
set status = case status
  when 'Nouveau' then 'À contacter'
  when '1er contact envoyé' then 'Relance 1'
  when 'Contacté' then 'Relance 1'
  when 'En conversation' then 'Relance 1'
  when 'À recontacter plus tard' then 'Relance 1'
  when 'Réponse reçue' then 'Relance 1'
  when 'Répondu' then 'Relance 1'
  when 'Relance 3 / dernière relance' then 'Relance 2'
  when 'Sans réponse' then 'Relance 2'
  when 'À qualifier' then 'En discussion'
  when 'Intéressé' then 'En discussion'
  when 'En réflexion' then 'En discussion'
  when 'Négociation' then 'En discussion'
  when 'Discussion avec comité / équipe' then 'En discussion'
  when 'Offre / prix envoyé' then 'En discussion'
  when 'Démo à planifier' then 'Démo'
  when 'Démo prévue' then 'Démo'
  when 'Démonstration' then 'Démo'
  when 'Démo effectuée' then 'Démo'
  when 'Démo faite' then 'Démo'
  when 'À relancer après démo' then 'Démo'
  when 'Appel booké' then 'Démo'
  when 'Closé' then 'Client'
  when 'Pas maintenant' then 'Fermé'
  when 'Pas intéressé' then 'Fermé'
  when 'Perdu' then 'Fermé'
  when 'Refusé' then 'Fermé'
  when 'Refus' then 'Fermé'
  else status
end;

-- Tout résidu inconnu → À contacter (legacy_status déjà sauvegardé)
update public.prospects
set
  legacy_status = coalesce(legacy_status, status),
  status = 'À contacter'
where status not in (
  'À contacter',
  'Relance 1',
  'Relance 2',
  'Relais',
  'En discussion',
  'Démo',
  'Client',
  'Fermé'
);

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
