-- Vérifications post-migration / avant déploiement cartes
-- À exécuter dans le SQL Editor Supabase (lecture seule recommandée)

-- 1) Nombre de matchs (attendu : 104 après sync Sportmonks)
select count(*) as matches_count from public.matches;

-- 2) Compte admin
select
  u.email,
  p.is_admin,
  p.username
from auth.users u
inner join public.profiles p on p.id = u.id
where lower(trim(u.email::text)) = lower(trim('goffinetvalentin05@gmail.com'));

-- 3) Colonnes Sportmonks présentes
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'matches'
  and column_name in (
    'external_api_provider',
    'external_match_id',
    'last_synced_at',
    'raw_api_payload'
  )
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'teams'
  and column_name in (
    'external_api_provider',
    'external_team_id',
    'raw_api_payload'
  )
order by column_name;

-- 4) Tables cartes
select
  (select count(*) from public.cards) as cards_catalog,
  (select count(*) from public.card_inventory) as card_inventory_rows,
  (select count(*) from public.card_plays) as card_plays_rows;

-- 5) Dernier sync log
select id, provider, status, started_at, matches_imported, matches_updated, error_message
from public.sync_logs
order by started_at desc
limit 3;
