-- =========================================================
-- WaveOne collaboration — membres, invitations, RLS projet.
-- Additive : aucune donnée existante n'est détruite.
-- L'espace personnel reste hors de ces tables (user_id + scope).
-- =========================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------
-- Tables
-- ---------------------------------------------------------
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  email text,
  display_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create unique index if not exists project_members_one_owner_idx
  on public.project_members (project_id)
  where role = 'owner';

create index if not exists project_members_user_idx
  on public.project_members (user_id, project_id);

alter table public.project_members enable row level security;

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text,
  token text not null unique,
  role text not null check (role in ('admin', 'member', 'viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_invitations_project_idx
  on public.project_invitations (project_id, created_at desc);
create index if not exists project_invitations_token_idx
  on public.project_invitations (token);

alter table public.project_invitations enable row level security;

-- ---------------------------------------------------------
-- Helpers (SECURITY DEFINER, hors schéma exposé)
-- ---------------------------------------------------------
create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members m
    where m.project_id = p_project_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function private.project_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.project_members m
  where m.project_id = p_project_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.has_project_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members m
    where m.project_id = p_project_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

revoke all on function private.is_project_member(uuid) from public, anon;
revoke all on function private.project_role(uuid) from public, anon;
revoke all on function private.has_project_role(uuid, text[]) from public, anon;
grant execute on function private.is_project_member(uuid) to authenticated, service_role;
grant execute on function private.project_role(uuid) to authenticated, service_role;
grant execute on function private.has_project_role(uuid, text[]) to authenticated, service_role;

create or replace function private.tg_projects_ensure_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role, created_by)
  values (new.id, new.user_id, 'owner', new.user_id)
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_ensure_owner_member on public.projects;
create trigger projects_ensure_owner_member
  after insert on public.projects
  for each row execute function private.tg_projects_ensure_owner_member();

-- Backfill : le créateur actuel devient owner.
insert into public.project_members (project_id, user_id, role, created_by)
select p.id, p.user_id, 'owner', p.user_id
from public.projects p
on conflict (project_id, user_id) do nothing;

-- ---------------------------------------------------------
-- RLS project_members / invitations
-- ---------------------------------------------------------
drop policy if exists "Members readable by project members" on public.project_members;
create policy "Members readable by project members"
  on public.project_members for select
  using (private.is_project_member(project_id) or user_id = auth.uid());

drop policy if exists "Owner can insert self as owner" on public.project_members;
create policy "Owner can insert self as owner"
  on public.project_members for insert
  with check (auth.uid() = user_id and role = 'owner');

drop policy if exists "Admins can update non-owner members" on public.project_members;
create policy "Admins can update non-owner members"
  on public.project_members for update
  using (
    private.has_project_role(project_id, array['owner', 'admin']::text[])
    and role <> 'owner'
  )
  with check (
    private.has_project_role(project_id, array['owner', 'admin']::text[])
    and role <> 'owner'
  );

drop policy if exists "Members can update own row" on public.project_members;
create policy "Members can update own row"
  on public.project_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = private.project_role(project_id));

drop policy if exists "Admins can remove non-owner members" on public.project_members;
create policy "Admins can remove non-owner members"
  on public.project_members for delete
  using (
    private.has_project_role(project_id, array['owner', 'admin']::text[])
    and role <> 'owner'
  );

drop policy if exists "Invitations readable by members" on public.project_invitations;
create policy "Invitations readable by members"
  on public.project_invitations for select
  using (private.is_project_member(project_id));

drop policy if exists "Admins can create invitations" on public.project_invitations;
create policy "Admins can create invitations"
  on public.project_invitations for insert
  with check (
    private.has_project_role(project_id, array['owner', 'admin']::text[])
    and created_by = auth.uid()
  );

drop policy if exists "Admins can update invitations" on public.project_invitations;
create policy "Admins can update invitations"
  on public.project_invitations for update
  using (private.has_project_role(project_id, array['owner', 'admin']::text[]))
  with check (private.has_project_role(project_id, array['owner', 'admin']::text[]));

drop policy if exists "Admins can delete invitations" on public.project_invitations;
create policy "Admins can delete invitations"
  on public.project_invitations for delete
  using (private.has_project_role(project_id, array['owner', 'admin']::text[]));

-- ---------------------------------------------------------
-- projects RLS : membres, plus seulement le propriétaire
-- ---------------------------------------------------------
drop policy if exists "Projects readable by owner" on public.projects;
drop policy if exists "Projects readable by members" on public.projects;
create policy "Projects readable by members"
  on public.projects for select
  using (auth.uid() = user_id or private.is_project_member(id));

drop policy if exists "Projects updatable by owner" on public.projects;
drop policy if exists "Projects updatable by admins" on public.projects;
create policy "Projects updatable by admins"
  on public.projects for update
  using (auth.uid() = user_id or private.has_project_role(id, array['owner', 'admin']::text[]))
  with check (auth.uid() = user_id or private.has_project_role(id, array['owner', 'admin']::text[]));

drop policy if exists "Projects deletable by owner" on public.projects;
drop policy if exists "Projects deletable by owner role" on public.projects;
create policy "Projects deletable by owner role"
  on public.projects for delete
  using (auth.uid() = user_id or private.has_project_role(id, array['owner']::text[]));

-- ---------------------------------------------------------
-- project_modules : étendre le check + accès membres
-- ---------------------------------------------------------
alter table public.project_modules drop constraint if exists project_modules_module_check;
alter table public.project_modules
  add constraint project_modules_module_check
  check (module in (
    'overview',
    'prospects',
    'companies',
    'tasks',
    'content',
    'notes',
    'activity',
    'calendar',
    'finances',
    'stats',
    'documents'
  ));

insert into public.project_modules (user_id, project_id, module, enabled)
select p.user_id, p.id, m.module, true
from public.projects p
cross join (
  values ('companies'), ('content'), ('activity')
) as m(module)
on conflict (project_id, module) do nothing;

drop policy if exists "Project modules readable by owner" on public.project_modules;
drop policy if exists "Project modules readable by members" on public.project_modules;
create policy "Project modules readable by members"
  on public.project_modules for select
  using (auth.uid() = user_id or private.is_project_member(project_id));

drop policy if exists "Project modules insertable by owner" on public.project_modules;
drop policy if exists "Project modules insertable by admins" on public.project_modules;
create policy "Project modules insertable by admins"
  on public.project_modules for insert
  with check (
    auth.uid() = user_id
    or private.has_project_role(project_id, array['owner', 'admin']::text[])
  );

drop policy if exists "Project modules updatable by owner" on public.project_modules;
drop policy if exists "Project modules updatable by admins" on public.project_modules;
create policy "Project modules updatable by admins"
  on public.project_modules for update
  using (
    auth.uid() = user_id
    or private.has_project_role(project_id, array['owner', 'admin']::text[])
  )
  with check (
    auth.uid() = user_id
    or private.has_project_role(project_id, array['owner', 'admin']::text[])
  );

drop policy if exists "Project modules deletable by owner" on public.project_modules;
drop policy if exists "Project modules deletable by admins" on public.project_modules;
create policy "Project modules deletable by admins"
  on public.project_modules for delete
  using (
    auth.uid() = user_id
    or private.has_project_role(project_id, array['owner', 'admin']::text[])
  );
