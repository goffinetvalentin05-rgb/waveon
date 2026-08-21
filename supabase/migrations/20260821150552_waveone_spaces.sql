-- =========================================================
-- WaveOne espaces — modules projet, PIN personnel, scope.
-- Additive : aucune donnée existante n'est détruite.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Modules par projet
-- ---------------------------------------------------------
create table if not exists public.project_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  module text not null
    check (module in (
      'overview',
      'prospects',
      'tasks',
      'calendar',
      'finances',
      'notes',
      'stats',
      'documents'
    )),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, module)
);

create index if not exists project_modules_user_idx
  on public.project_modules (user_id, project_id);

alter table public.project_modules enable row level security;

drop policy if exists "Project modules readable by owner" on public.project_modules;
create policy "Project modules readable by owner"
  on public.project_modules for select using (auth.uid() = user_id);

drop policy if exists "Project modules insertable by owner" on public.project_modules;
create policy "Project modules insertable by owner"
  on public.project_modules for insert with check (auth.uid() = user_id);

drop policy if exists "Project modules updatable by owner" on public.project_modules;
create policy "Project modules updatable by owner"
  on public.project_modules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Project modules deletable by owner" on public.project_modules;
create policy "Project modules deletable by owner"
  on public.project_modules for delete using (auth.uid() = user_id);

-- Seed non destructif : tous les modules "métier" actifs, documents off.
insert into public.project_modules (user_id, project_id, module, enabled)
select p.user_id, p.id, m.module, m.enabled
from public.projects p
cross join (
  values
    ('overview', true),
    ('prospects', true),
    ('tasks', true),
    ('calendar', true),
    ('finances', true),
    ('notes', true),
    ('stats', true),
    ('documents', false)
) as m(module, enabled)
on conflict (project_id, module) do nothing;

-- ---------------------------------------------------------
-- 2. PIN / verrouillage de l'espace Personnel
-- pin_hash jamais en clair (hash scrypt côté serveur).
-- ---------------------------------------------------------
create table if not exists public.personal_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text,
  lock_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.personal_security enable row level security;

drop policy if exists "Personal security readable by owner" on public.personal_security;
create policy "Personal security readable by owner"
  on public.personal_security for select using (auth.uid() = user_id);

drop policy if exists "Personal security insertable by owner" on public.personal_security;
create policy "Personal security insertable by owner"
  on public.personal_security for insert with check (auth.uid() = user_id);

drop policy if exists "Personal security updatable by owner" on public.personal_security;
create policy "Personal security updatable by owner"
  on public.personal_security for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists personal_security_updated_at on public.personal_security;
create trigger personal_security_updated_at
  before update on public.personal_security
  for each row execute function public.tg_crm_set_updated_at();

-- ---------------------------------------------------------
-- 3. Scope personnel vs projet (tâches)
-- Une donnée personnelle n'a jamais de project_id.
-- Les tâches déjà rattachées à un projet restent "project".
-- Les autres restent accessibles : scope project + project_id null
-- (= « Sans projet ») — on ne devine pas qu'elles sont personnelles.
-- ---------------------------------------------------------
alter table public.daily_tasks
  add column if not exists scope text;

update public.daily_tasks
  set scope = case when project_id is not null then 'project' else 'project' end
  where scope is null;

alter table public.daily_tasks
  alter column scope set default 'project';

update public.daily_tasks set scope = 'project' where scope is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_tasks_scope_check'
  ) then
    alter table public.daily_tasks
      add constraint daily_tasks_scope_check
      check (
        scope in ('personal', 'project')
        and (
          (scope = 'personal' and project_id is null)
          or scope = 'project'
        )
      );
  end if;
end $$;

create index if not exists daily_tasks_user_scope_idx
  on public.daily_tasks (user_id, scope, due_date);

-- ---------------------------------------------------------
-- 4. Scope notes
-- ---------------------------------------------------------
alter table public.workspace_notes
  add column if not exists scope text;

update public.workspace_notes
  set scope = 'project'
  where scope is null;

alter table public.workspace_notes
  alter column scope set default 'project';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workspace_notes_scope_check'
  ) then
    alter table public.workspace_notes
      add constraint workspace_notes_scope_check
      check (
        scope in ('personal', 'project')
        and (
          (scope = 'personal' and project_id is null)
          or scope = 'project'
        )
      );
  end if;
end $$;

create index if not exists workspace_notes_user_scope_idx
  on public.workspace_notes (user_id, scope, updated_at desc);

-- ---------------------------------------------------------
-- 5. Calendrier : project_id + scope
-- Événements existants sans projet → personnels (le calendrier
-- vivait dans l'espace personnel). On ne les rattache pas à Obillz.
-- ---------------------------------------------------------
alter table public.calendar_events
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.calendar_events
  add column if not exists scope text;

update public.calendar_events
  set scope = case when project_id is not null then 'project' else 'personal' end
  where scope is null;

alter table public.calendar_events
  alter column scope set default 'personal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_scope_check'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_scope_check
      check (
        scope in ('personal', 'project')
        and (
          (scope = 'personal' and project_id is null)
          or scope = 'project'
        )
      );
  end if;
end $$;

create index if not exists calendar_events_user_scope_idx
  on public.calendar_events (user_id, scope, start_at);

create index if not exists calendar_events_user_project_idx
  on public.calendar_events (user_id, project_id, start_at);
