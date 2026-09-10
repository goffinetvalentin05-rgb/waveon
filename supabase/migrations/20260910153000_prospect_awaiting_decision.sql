-- Étape « Décision en attente » (après une démo effectuée)
-- et action d'historique demo_done.
-- Les prospects déjà en « Démo » restent en démo planifiée.

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
    'Décision en attente',
    'Client',
    'Fermé'
  ));

alter table public.prospect_activities
  drop constraint if exists prospect_activities_action_type_check;

alter table public.prospect_activities
  add constraint prospect_activities_action_type_check
  check (action_type in (
    'mail_sent',
    'call_made',
    'demo_scheduled',
    'demo_done',
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
    'message',
    'linkedin',
    'meeting',
    'demo',
    'other',
    'first_contact',
    'follow_up',
    'reply',
    'offer'
  ));

-- Alias historiques encore stockés tels quels (hors pipeline actuel).
update public.prospects
set
  legacy_status = coalesce(legacy_status, status),
  status = 'Décision en attente'
where status in (
  'Démo effectuée',
  'Démo faite',
  'À relancer après démo'
);
