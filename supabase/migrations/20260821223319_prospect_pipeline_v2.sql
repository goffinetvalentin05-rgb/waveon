-- Pipeline de prospection v2 : statuts plus précis + prochaine action.
-- Compatible : aucune suppression de prospects, notes, interactions ou projets.

alter table public.prospects drop constraint if exists prospects_status_check;

update public.prospects
set status = case status
  when 'Contacté' then '1er contact envoyé'
  when 'Répondu' then 'Réponse reçue'
  when 'Démo faite' then 'Démo effectuée'
  when 'Négociation' then 'En réflexion'
  when 'Refusé' then 'Pas intéressé'
  when 'Refus' then 'Pas intéressé'
  when 'Démonstration' then 'Démo prévue'
  when 'Pas intéressé' then 'Pas intéressé'
  else status
end
where status in (
  'Contacté',
  'Répondu',
  'Démo faite',
  'Négociation',
  'Refusé',
  'Refus',
  'Démonstration',
  'Pas intéressé'
);

-- Statuts historiques encore plus anciens
update public.prospects
set status = case status
  when 'Nouveau' then 'À contacter'
  when 'En conversation' then '1er contact envoyé'
  when 'Appel booké' then 'Démo prévue'
  when 'Closé' then 'Client'
  else status
end
where status in ('Nouveau', 'En conversation', 'Appel booké', 'Closé');

alter table public.prospects
  add column if not exists next_action text;

update public.prospects
set next_action = case status
  when 'À contacter' then 'Premier contact'
  when '1er contact envoyé' then 'Envoyer relance 1'
  when 'Relance 1' then 'Envoyer relance 2'
  when 'Relance 2' then 'Envoyer relance 3 / dernière relance'
  when 'Relance 3 / dernière relance' then 'Décider : sans réponse ou recontacter plus tard'
  when 'Sans réponse' then 'Classer ou recontacter plus tard'
  when 'À recontacter plus tard' then 'Reprendre contact'
  when 'Réponse reçue' then 'Qualifier le besoin'
  when 'À qualifier' then 'Qualifier le besoin'
  when 'Intéressé' then 'Planifier une démo'
  when 'Démo à planifier' then 'Proposer un créneau'
  when 'Démo prévue' then 'Préparer / confirmer la démo'
  when 'Démo effectuée' then 'Relancer après démo'
  when 'À relancer après démo' then 'Relancer après démo'
  when 'En réflexion' then 'Relancer'
  when 'Discussion avec comité / équipe' then 'Relancer le décideur'
  when 'Offre / prix envoyé' then 'Relancer l''offre'
  else next_action
end
where next_action is null
  and status not in ('Client', 'Pas maintenant', 'Pas intéressé', 'Perdu');

update public.prospects
set status = 'À contacter'
where status not in (
  'À contacter',
  '1er contact envoyé',
  'Relance 1',
  'Relance 2',
  'Relance 3 / dernière relance',
  'Sans réponse',
  'À recontacter plus tard',
  'Réponse reçue',
  'À qualifier',
  'Intéressé',
  'Démo à planifier',
  'Démo prévue',
  'Démo effectuée',
  'À relancer après démo',
  'En réflexion',
  'Discussion avec comité / équipe',
  'Offre / prix envoyé',
  'Client',
  'Pas maintenant',
  'Pas intéressé',
  'Perdu'
);

alter table public.prospects
  alter column status set default 'À contacter';

alter table public.prospects
  add constraint prospects_status_check
  check (status in (
    'À contacter',
    '1er contact envoyé',
    'Relance 1',
    'Relance 2',
    'Relance 3 / dernière relance',
    'Sans réponse',
    'À recontacter plus tard',
    'Réponse reçue',
    'À qualifier',
    'Intéressé',
    'Démo à planifier',
    'Démo prévue',
    'Démo effectuée',
    'À relancer après démo',
    'En réflexion',
    'Discussion avec comité / équipe',
    'Offre / prix envoyé',
    'Client',
    'Pas maintenant',
    'Pas intéressé',
    'Perdu'
  ));

alter table public.prospect_activities
  add column if not exists channel text;

alter table public.prospect_activities
  drop constraint if exists prospect_activities_action_type_check;

alter table public.prospect_activities
  add constraint prospect_activities_action_type_check
  check (action_type in (
    'mail_sent',
    'call_made',
    'demo_scheduled',
    'client',
    'refus',
    'note',
    'status_change',
    'imported',
    'created',
    'archived',
    'restored',
    'call',
    'whatsapp',
    'email',
    'meeting',
    'demo',
    'other',
    'first_contact',
    'follow_up',
    'reply',
    'offer'
  ));
