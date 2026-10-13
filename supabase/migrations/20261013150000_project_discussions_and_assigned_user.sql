-- =========================================================
-- Raven — Discussions projet + responsable membre (assigned_user_id)
-- Additive : aucune donnée existante n'est détruite.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Responsable prospect = membre du projet (auth.users)
--    Conservé distinct de user_id (créateur) et assigned_to (people).
-- ---------------------------------------------------------
alter table public.prospects
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;

create index if not exists prospects_project_assigned_user_idx
  on public.prospects (project_id, assigned_user_id)
  where project_id is not null;

-- Backfill sécurisé :
-- Utiliser le créateur (user_id) s'il est membre du projet ou owner ;
-- sinon laisser NULL (« Non attribué »). Ne jamais inventer un responsable.
-- Note : assigned_to (people) est un carnet perso, pas un membre projet — non réutilisé.
update public.prospects p
set assigned_user_id = p.user_id
where p.assigned_user_id is null
  and p.project_id is not null
  and (
    exists (
      select 1 from public.project_members m
      where m.project_id = p.project_id and m.user_id = p.user_id
    )
    or exists (
      select 1 from public.projects pr
      where pr.id = p.project_id and pr.user_id = p.user_id
    )
  );

-- ---------------------------------------------------------
-- 2. Messages de discussion par projet
-- ---------------------------------------------------------
create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 8000),
  client_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists project_messages_project_created_idx
  on public.project_messages (project_id, created_at asc);

create unique index if not exists project_messages_project_client_uidx
  on public.project_messages (project_id, client_id)
  where client_id is not null;

alter table public.project_messages enable row level security;

drop policy if exists "Messages readable by project members" on public.project_messages;
create policy "Messages readable by project members"
  on public.project_messages for select
  using (private.is_project_member(project_id));

drop policy if exists "Messages insertable by project members" on public.project_messages;
create policy "Messages insertable by project members"
  on public.project_messages for insert
  with check (
    author_id = auth.uid()
    and private.has_project_role(project_id, array['owner', 'admin', 'member']::text[])
  );

-- Pas d'update/delete en v1 (historique immuable)

-- Realtime (idempotent si déjà présent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_messages'
  ) then
    alter publication supabase_realtime add table public.project_messages;
  end if;
exception
  when undefined_object then
    null;
end $$;

-- ---------------------------------------------------------
-- 3. Lectures (indicateur non lus)
-- ---------------------------------------------------------
create table if not exists public.project_discussion_reads (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_discussion_reads enable row level security;

drop policy if exists "Discussion reads readable by self" on public.project_discussion_reads;
create policy "Discussion reads readable by self"
  on public.project_discussion_reads for select
  using (
    user_id = auth.uid()
    and private.is_project_member(project_id)
  );

drop policy if exists "Discussion reads upsertable by self" on public.project_discussion_reads;
create policy "Discussion reads upsertable by self"
  on public.project_discussion_reads for insert
  with check (
    user_id = auth.uid()
    and private.is_project_member(project_id)
  );

drop policy if exists "Discussion reads updatable by self" on public.project_discussion_reads;
create policy "Discussion reads updatable by self"
  on public.project_discussion_reads for update
  using (
    user_id = auth.uid()
    and private.is_project_member(project_id)
  )
  with check (
    user_id = auth.uid()
    and private.is_project_member(project_id)
  );
