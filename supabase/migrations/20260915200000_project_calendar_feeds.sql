-- Flux iCalendar privé par projet (Waveone → Apple Calendar, lecture seule).
-- Le token est un secret : unique, révocable, indépendant du project_id.

create table if not exists public.project_calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  token text not null unique,
  enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_calendar_feeds_token_len check (char_length(token) >= 48)
);

create index if not exists project_calendar_feeds_token_enabled_idx
  on public.project_calendar_feeds (token)
  where enabled = true;

create index if not exists calendar_events_project_scope_start_idx
  on public.calendar_events (project_id, start_at)
  where scope = 'project' and project_id is not null;

drop trigger if exists project_calendar_feeds_set_updated_at on public.project_calendar_feeds;
create trigger project_calendar_feeds_set_updated_at
  before update on public.project_calendar_feeds
  for each row execute function public.set_updated_at();

alter table public.project_calendar_feeds enable row level security;

drop policy if exists "Calendar feeds readable by members" on public.project_calendar_feeds;
create policy "Calendar feeds readable by members"
  on public.project_calendar_feeds for select
  using (private.is_project_member(project_id));

drop policy if exists "Calendar feeds writable by admins" on public.project_calendar_feeds;
create policy "Calendar feeds writable by admins"
  on public.project_calendar_feeds for insert
  with check (private.has_project_role(project_id, array['owner', 'admin']::text[]));

drop policy if exists "Calendar feeds updatable by admins" on public.project_calendar_feeds;
create policy "Calendar feeds updatable by admins"
  on public.project_calendar_feeds for update
  using (private.has_project_role(project_id, array['owner', 'admin']::text[]))
  with check (private.has_project_role(project_id, array['owner', 'admin']::text[]));

drop policy if exists "Calendar feeds deletable by admins" on public.project_calendar_feeds;
create policy "Calendar feeds deletable by admins"
  on public.project_calendar_feeds for delete
  using (private.has_project_role(project_id, array['owner', 'admin']::text[]));
