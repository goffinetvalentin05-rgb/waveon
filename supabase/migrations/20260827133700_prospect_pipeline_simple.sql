-- Pipeline commercial simplifié : 7 statuts.
-- Conserve les anciens statuts dans legacy_status. Aucune suppression de prospects.

alter table public.prospects
  add column if not exists legacy_status text,
  add column if not exists closed_reason text,
  add column if not exists closed_note text;

alter table public.prospects drop constraint if exists prospects_status_check;

update public.prospects
set legacy_status = status
where legacy_status is null
  and status is not null
  and status not in (
    'À contacter',
    'Relance 1',
    'Relance 2',
    'En discussion',
    'Démo',
    'Client',
    'Fermé'
  );

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

update public.prospects
set
  legacy_status = coalesce(legacy_status, status),
  status = 'À contacter'
where status not in (
  'À contacter',
  'Relance 1',
  'Relance 2',
  'En discussion',
  'Démo',
  'Client',
  'Fermé'
);

update public.prospects
set next_action = case status
  when 'À contacter' then coalesce(next_action, 'Premier contact')
  when 'Relance 1' then coalesce(next_action, 'Envoyer relance 1')
  when 'Relance 2' then coalesce(next_action, 'Envoyer relance 2')
  when 'En discussion' then coalesce(next_action, 'Relancer')
  when 'Démo' then coalesce(next_action, 'Préparer / confirmer la démo')
  else next_action
end
where next_action is null
  and status in ('À contacter', 'Relance 1', 'Relance 2', 'En discussion', 'Démo');

update public.prospects
set next_action = null,
    next_follow_up = null
where status in ('Client', 'Fermé');

alter table public.prospects
  alter column status set default 'À contacter';

alter table public.prospects
  add constraint prospects_status_check
  check (status in (
    'À contacter',
    'Relance 1',
    'Relance 2',
    'En discussion',
    'Démo',
    'Client',
    'Fermé'
  ));

alter table public.prospects
  drop constraint if exists prospects_closed_reason_check;

alter table public.prospects
  add constraint prospects_closed_reason_check
  check (
    closed_reason is null
    or closed_reason in (
      'Pas intéressé',
      'Déjà équipé',
      'Pas le bon moment',
      'Mauvais contact',
      'Aucun retour après relances',
      'Autre'
    )
  );
