-- =========================================================
-- Invitations, archivage, suppression projet.
-- Additive. Les données personnelles (user_id + scope personal)
-- ne sont jamais liées à projects en cascade.
-- =========================================================

-- Snapshot du nom de l'invitant (page publique d'invitation)
alter table public.project_invitations
  add column if not exists inviter_name text;

-- ---------------------------------------------------------
-- project_id → CASCADE pour les données DU PROJET uniquement.
-- Les lignes personnelles ont project_id NULL : intactes.
-- ---------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select c.conname, rel.relname as tbl
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and c.contype = 'f'
      and c.confrelid = 'public.projects'::regclass
      and rel.relname in (
        'prospects',
        'daily_tasks',
        'expenses',
        'finance_subscriptions',
        'workspace_notes',
        'workspace_events',
        'calendar_events'
      )
  loop
    execute format('alter table public.%I drop constraint if exists %I', rec.tbl, rec.conname);
  end loop;
end $$;

alter table public.prospects
  add constraint prospects_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.daily_tasks
  add constraint daily_tasks_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.expenses
  add constraint expenses_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.finance_subscriptions
  add constraint finance_subscriptions_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.workspace_notes
  add constraint workspace_notes_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.workspace_events
  add constraint workspace_events_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.calendar_events
  add constraint calendar_events_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

-- Un membre (pas owner) peut quitter un projet lui-même.
drop policy if exists "Members can leave project" on public.project_members;
create policy "Members can leave project"
  on public.project_members for delete
  using (auth.uid() = user_id and role <> 'owner');
