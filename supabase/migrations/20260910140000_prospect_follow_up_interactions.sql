-- Suivi prospects : interactions (canal + type) indépendantes de l'étape
-- et de la prochaine date de relance. Nettoie les échéances déjà traitées.
-- Aucune suppression de prospects ni d'historique.

alter table public.prospect_activities
  add column if not exists interaction_type text;

alter table public.prospect_activities
  drop constraint if exists prospect_activities_interaction_type_check;

alter table public.prospect_activities
  add constraint prospect_activities_interaction_type_check
  check (
    interaction_type is null
    or interaction_type in (
      'first_contact',
      'follow_up_1',
      'follow_up_2',
      'follow_up_3',
      'other'
    )
  );

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

-- Backfill des interactions existantes (sans écraser un type déjà renseigné).
update public.prospect_activities
set interaction_type = case
  when action_type = 'first_contact' then 'first_contact'
  when action_type in ('mail_sent', 'email') and title ilike '%premier%' then 'first_contact'
  when title ilike '%relance 3%' then 'follow_up_3'
  when title ilike '%relance 2%' then 'follow_up_2'
  when title ilike '%relance 1%' then 'follow_up_1'
  when action_type in ('mail_sent', 'call_made', 'email', 'call', 'message', 'whatsapp', 'follow_up')
    then 'other'
  else interaction_type
end
where interaction_type is null
  and action_type in (
    'mail_sent',
    'call_made',
    'email',
    'call',
    'message',
    'whatsapp',
    'first_contact',
    'follow_up',
    'linkedin'
  );

update public.prospect_activities
set channel = case action_type
  when 'mail_sent' then coalesce(nullif(channel, ''), 'Email')
  when 'email' then coalesce(nullif(channel, ''), 'Email')
  when 'call_made' then coalesce(nullif(channel, ''), 'Appel')
  when 'call' then coalesce(nullif(channel, ''), 'Appel')
  when 'message' then coalesce(nullif(channel, ''), 'Message')
  when 'whatsapp' then coalesce(nullif(channel, ''), 'Message')
  else channel
end
where action_type in ('mail_sent', 'email', 'call_made', 'call', 'message', 'whatsapp')
  and (channel is null or channel = '');

-- Échéances déjà traitées : un contact le jour J ou après clôture l'ancienne relance.
-- Clients / fermés : plus aucune alerte de relance.
update public.prospects
set next_follow_up = null
where next_follow_up is not null
  and (
    status in ('Client', 'Fermé')
    or (
      last_action_at is not null
      and (last_action_at at time zone 'Europe/Zurich')::date >= next_follow_up
    )
  );

create index if not exists prospect_activities_interaction_type_idx
  on public.prospect_activities (prospect_id, interaction_type)
  where interaction_type is not null;
