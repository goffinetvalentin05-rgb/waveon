-- =========================================================
-- WaveOne — prospects organisations + contacts, contenu, documents.
-- Additive : aucune donnée existante n'est détruite.
-- Pas de table `companies` à migrer (module placeholder uniquement).
-- =========================================================

-- ---------------------------------------------------------
-- Prospects : champs organisation
-- ---------------------------------------------------------
alter table public.prospects
  add column if not exists logo_url text,
  add column if not exists address text,
  add column if not exists country text,
  add column if not exists linkedin_url text,
  add column if not exists source text,
  add column if not exists priority text;

update public.prospects
set priority = 'Normale'
where priority is null or trim(priority) = '';

alter table public.prospects
  alter column priority set default 'Normale';

alter table public.prospects
  drop constraint if exists prospects_priority_check;
alter table public.prospects
  add constraint prospects_priority_check
  check (priority in ('Faible', 'Normale', 'Haute', 'Urgente'));

-- LinkedIn comme type d'interaction
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
    'linkedin',
    'meeting',
    'demo',
    'other',
    'first_contact',
    'follow_up',
    'reply',
    'offer'
  ));

-- ---------------------------------------------------------
-- Contacts personnes (plusieurs par prospect)
-- ---------------------------------------------------------
create table if not exists public.prospect_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  first_name text not null default '',
  last_name text,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_contacts_prospect_idx
  on public.prospect_contacts (prospect_id, created_at);
create index if not exists prospect_contacts_user_idx
  on public.prospect_contacts (user_id, prospect_id);

create unique index if not exists prospect_contacts_one_primary_idx
  on public.prospect_contacts (prospect_id)
  where is_primary;

alter table public.prospect_contacts enable row level security;

-- Backfill depuis le contact unique historique (nom / fonction / email / tel).
insert into public.prospect_contacts (
  user_id,
  prospect_id,
  first_name,
  last_name,
  job_title,
  email,
  phone,
  is_primary
)
select
  p.user_id,
  p.id,
  coalesce(
    nullif(split_part(trim(coalesce(p.contact_name, '')), ' ', 1), ''),
    'Contact'
  ),
  nullif(
    trim(regexp_replace(coalesce(p.contact_name, ''), '^[^[:space:]]+[[:space:]]*', '')),
    ''
  ),
  nullif(trim(coalesce(p.contact_function, '')), ''),
  nullif(trim(coalesce(p.email, '')), ''),
  nullif(trim(coalesce(p.phone, p.phone_number, '')), ''),
  true
from public.prospects p
where coalesce(
    nullif(trim(coalesce(p.contact_name, '')), ''),
    nullif(trim(coalesce(p.email, '')), ''),
    nullif(trim(coalesce(p.phone, '')), ''),
    nullif(trim(coalesce(p.phone_number, '')), ''),
    nullif(trim(coalesce(p.contact_function, '')), '')
  ) is not null
  and not exists (
    select 1 from public.prospect_contacts c where c.prospect_id = p.id
  );

-- ---------------------------------------------------------
-- Idées de contenu (module projet)
-- ---------------------------------------------------------
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  body text,
  category text,
  platform text,
  status text not null default 'idée',
  scheduled_at timestamptz,
  published_at timestamptz,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_status_check
    check (status in ('idée', 'en cours', 'planifié', 'publié'))
);

create index if not exists content_items_project_idx
  on public.content_items (project_id, created_at desc);
create index if not exists content_items_user_idx
  on public.content_items (user_id, project_id);

alter table public.content_items enable row level security;

-- ---------------------------------------------------------
-- Documents projet
-- ---------------------------------------------------------
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_idx
  on public.project_documents (project_id, created_at desc);

alter table public.project_documents enable row level security;

-- ---------------------------------------------------------
-- Helper : accès à un prospect (owner ou membre du projet)
-- ---------------------------------------------------------
create or replace function private.can_access_prospect(p_prospect_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.prospects p
    where p.id = p_prospect_id
      and (
        p.user_id = auth.uid()
        or (p.project_id is not null and private.is_project_member(p.project_id))
      )
  );
$$;

revoke all on function private.can_access_prospect(uuid) from public, anon;
grant execute on function private.can_access_prospect(uuid) to authenticated, service_role;

create or replace function private.can_write_prospect(p_prospect_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.prospects p
    where p.id = p_prospect_id
      and (
        p.user_id = auth.uid()
        or (
          p.project_id is not null
          and private.has_project_role(p.project_id, array['owner', 'admin', 'member']::text[])
        )
      )
  );
$$;

revoke all on function private.can_write_prospect(uuid) from public, anon;
grant execute on function private.can_write_prospect(uuid) to authenticated, service_role;

-- ---------------------------------------------------------
-- RLS prospects / activités : membres du projet
-- ---------------------------------------------------------
drop policy if exists "Prospects are readable by owner" on public.prospects;
drop policy if exists "Prospects readable by owner or members" on public.prospects;
create policy "Prospects readable by owner or members"
  on public.prospects for select
  using (
    auth.uid() = user_id
    or (project_id is not null and private.is_project_member(project_id))
  );

drop policy if exists "Prospects are insertable by owner" on public.prospects;
drop policy if exists "Prospects insertable by owner or members" on public.prospects;
create policy "Prospects insertable by owner or members"
  on public.prospects for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
    )
  );

drop policy if exists "Prospects are updatable by owner" on public.prospects;
drop policy if exists "Prospects updatable by owner or members" on public.prospects;
create policy "Prospects updatable by owner or members"
  on public.prospects for update
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  )
  with check (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Prospects are deletable by owner" on public.prospects;
drop policy if exists "Prospects deletable by owner or members" on public.prospects;
create policy "Prospects deletable by owner or members"
  on public.prospects for delete
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Activities readable by owner" on public.prospect_activities;
drop policy if exists "Activities readable by prospect access" on public.prospect_activities;
create policy "Activities readable by prospect access"
  on public.prospect_activities for select
  using (auth.uid() = user_id or private.can_access_prospect(prospect_id));

drop policy if exists "Activities insertable by owner" on public.prospect_activities;
drop policy if exists "Activities insertable by prospect access" on public.prospect_activities;
create policy "Activities insertable by prospect access"
  on public.prospect_activities for insert
  with check (auth.uid() = user_id and private.can_write_prospect(prospect_id));

drop policy if exists "Activities updatable by owner" on public.prospect_activities;
drop policy if exists "Activities updatable by prospect access" on public.prospect_activities;
create policy "Activities updatable by prospect access"
  on public.prospect_activities for update
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id))
  with check (auth.uid() = user_id or private.can_write_prospect(prospect_id));

drop policy if exists "Activities deletable by owner" on public.prospect_activities;
drop policy if exists "Activities deletable by prospect access" on public.prospect_activities;
create policy "Activities deletable by prospect access"
  on public.prospect_activities for delete
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id));

-- Contacts
drop policy if exists "Contacts readable by prospect access" on public.prospect_contacts;
create policy "Contacts readable by prospect access"
  on public.prospect_contacts for select
  using (auth.uid() = user_id or private.can_access_prospect(prospect_id));

drop policy if exists "Contacts insertable by prospect access" on public.prospect_contacts;
create policy "Contacts insertable by prospect access"
  on public.prospect_contacts for insert
  with check (auth.uid() = user_id and private.can_write_prospect(prospect_id));

drop policy if exists "Contacts updatable by prospect access" on public.prospect_contacts;
create policy "Contacts updatable by prospect access"
  on public.prospect_contacts for update
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id))
  with check (auth.uid() = user_id or private.can_write_prospect(prospect_id));

drop policy if exists "Contacts deletable by prospect access" on public.prospect_contacts;
create policy "Contacts deletable by prospect access"
  on public.prospect_contacts for delete
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id));

-- Contenu
drop policy if exists "Content readable by project members" on public.content_items;
create policy "Content readable by project members"
  on public.content_items for select
  using (auth.uid() = user_id or private.is_project_member(project_id));

drop policy if exists "Content insertable by project members" on public.content_items;
create policy "Content insertable by project members"
  on public.content_items for insert
  with check (
    auth.uid() = user_id
    and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
  );

drop policy if exists "Content updatable by project members" on public.content_items;
create policy "Content updatable by project members"
  on public.content_items for update
  using (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  with check (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]));

drop policy if exists "Content deletable by project members" on public.content_items;
create policy "Content deletable by project members"
  on public.content_items for delete
  using (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]));

-- Documents
drop policy if exists "Documents readable by project members" on public.project_documents;
create policy "Documents readable by project members"
  on public.project_documents for select
  using (auth.uid() = user_id or private.is_project_member(project_id));

drop policy if exists "Documents insertable by project members" on public.project_documents;
create policy "Documents insertable by project members"
  on public.project_documents for insert
  with check (
    auth.uid() = user_id
    and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
  );

drop policy if exists "Documents updatable by project members" on public.project_documents;
create policy "Documents updatable by project members"
  on public.project_documents for update
  using (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  with check (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]));

drop policy if exists "Documents deletable by project members" on public.project_documents;
create policy "Documents deletable by project members"
  on public.project_documents for delete
  using (private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]));

-- ---------------------------------------------------------
-- Désactiver le module Entreprises (plus de nav, données intactes)
-- ---------------------------------------------------------
update public.project_modules
set enabled = false
where module = 'companies';

-- ---------------------------------------------------------
-- Tâches / notes / calendrier / activité : membres du projet
-- L'espace personnel (project_id null) reste privé au propriétaire.
-- ---------------------------------------------------------
drop policy if exists "Tasks readable by owner" on public.daily_tasks;
drop policy if exists "Tasks readable by owner or members" on public.daily_tasks;
create policy "Tasks readable by owner or members"
  on public.daily_tasks for select
  using (
    auth.uid() = user_id
    or (project_id is not null and private.is_project_member(project_id))
  );

drop policy if exists "Tasks insertable by owner" on public.daily_tasks;
drop policy if exists "Tasks insertable by owner or members" on public.daily_tasks;
create policy "Tasks insertable by owner or members"
  on public.daily_tasks for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
    )
  );

drop policy if exists "Tasks updatable by owner" on public.daily_tasks;
drop policy if exists "Tasks updatable by owner or members" on public.daily_tasks;
create policy "Tasks updatable by owner or members"
  on public.daily_tasks for update
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  )
  with check (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Tasks deletable by owner" on public.daily_tasks;
drop policy if exists "Tasks deletable by owner or members" on public.daily_tasks;
create policy "Tasks deletable by owner or members"
  on public.daily_tasks for delete
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Notes readable by owner" on public.workspace_notes;
drop policy if exists "Notes readable by owner or members" on public.workspace_notes;
create policy "Notes readable by owner or members"
  on public.workspace_notes for select
  using (
    auth.uid() = user_id
    or (project_id is not null and private.is_project_member(project_id))
  );

drop policy if exists "Notes insertable by owner" on public.workspace_notes;
drop policy if exists "Notes insertable by owner or members" on public.workspace_notes;
create policy "Notes insertable by owner or members"
  on public.workspace_notes for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
    )
  );

drop policy if exists "Notes updatable by owner" on public.workspace_notes;
drop policy if exists "Notes updatable by owner or members" on public.workspace_notes;
create policy "Notes updatable by owner or members"
  on public.workspace_notes for update
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  )
  with check (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Notes deletable by owner" on public.workspace_notes;
drop policy if exists "Notes deletable by owner or members" on public.workspace_notes;
create policy "Notes deletable by owner or members"
  on public.workspace_notes for delete
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "calendar_events_select_own" on public.calendar_events;
drop policy if exists "Calendar readable by owner or members" on public.calendar_events;
create policy "Calendar readable by owner or members"
  on public.calendar_events for select
  using (
    auth.uid() = user_id
    or (project_id is not null and private.is_project_member(project_id))
  );

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
drop policy if exists "Calendar insertable by owner or members" on public.calendar_events;
create policy "Calendar insertable by owner or members"
  on public.calendar_events for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
    )
  );

drop policy if exists "calendar_events_update_own" on public.calendar_events;
drop policy if exists "Calendar updatable by owner or members" on public.calendar_events;
create policy "Calendar updatable by owner or members"
  on public.calendar_events for update
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  )
  with check (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
drop policy if exists "Calendar deletable by owner or members" on public.calendar_events;
create policy "Calendar deletable by owner or members"
  on public.calendar_events for delete
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );

drop policy if exists "Events readable by owner" on public.workspace_events;
drop policy if exists "Events readable by owner or members" on public.workspace_events;
create policy "Events readable by owner or members"
  on public.workspace_events for select
  using (
    auth.uid() = user_id
    or (project_id is not null and private.is_project_member(project_id))
  );

drop policy if exists "Events insertable by owner" on public.workspace_events;
drop policy if exists "Events insertable by owner or members" on public.workspace_events;
create policy "Events insertable by owner or members"
  on public.workspace_events for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
    )
  );

drop policy if exists "Events deletable by owner" on public.workspace_events;
drop policy if exists "Events deletable by owner or members" on public.workspace_events;
create policy "Events deletable by owner or members"
  on public.workspace_events for delete
  using (
    auth.uid() = user_id
    or (project_id is not null and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[]))
  );
