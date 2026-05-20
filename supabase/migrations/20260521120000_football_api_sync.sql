-- Prono Clash — intégration API football (Sportmonks) + logs de sync

alter table public.teams
  add column if not exists external_api_provider text,
  add column if not exists external_team_id text,
  add column if not exists raw_api_payload jsonb;

create unique index if not exists teams_external_provider_team_idx
  on public.teams (external_api_provider, external_team_id)
  where external_team_id is not null;

alter table public.matches
  add column if not exists external_api_provider text,
  add column if not exists external_match_id text,
  add column if not exists external_competition_id text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists score_last_synced_at timestamptz,
  add column if not exists raw_api_payload jsonb;

create unique index if not exists matches_external_match_id_idx
  on public.matches (external_match_id)
  where external_match_id is not null;

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  sync_type text not null default 'full',
  status text not null default 'running',
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  matches_imported integer not null default 0,
  matches_updated integer not null default 0,
  scores_updated integer not null default 0,
  points_recalculated integer not null default 0,
  error_message text,
  raw_summary jsonb
);

create index if not exists sync_logs_started_at_idx on public.sync_logs (started_at desc);

alter table public.sync_logs enable row level security;

drop policy if exists sync_logs_admin_select on public.sync_logs;
create policy sync_logs_admin_select on public.sync_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists sync_logs_admin_insert on public.sync_logs;
create policy sync_logs_admin_insert on public.sync_logs
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists sync_logs_admin_update on public.sync_logs;
create policy sync_logs_admin_update on public.sync_logs
  for update to authenticated
  using (public.is_admin());
