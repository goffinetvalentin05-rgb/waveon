-- =========================================================
-- WaveOne command center — projets, personnes, CRM, tâches,
-- finances, notes. Additive : aucune donnée existante n'est
-- détruite.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. Projets
-- ---------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  color text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_status_idx
  on public.projects (user_id, status, name);

alter table public.projects enable row level security;

drop policy if exists "Projects readable by owner" on public.projects;
create policy "Projects readable by owner"
  on public.projects for select using (auth.uid() = user_id);

drop policy if exists "Projects insertable by owner" on public.projects;
create policy "Projects insertable by owner"
  on public.projects for insert with check (auth.uid() = user_id);

drop policy if exists "Projects updatable by owner" on public.projects;
create policy "Projects updatable by owner"
  on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Projects deletable by owner" on public.projects;
create policy "Projects deletable by owner"
  on public.projects for delete using (auth.uid() = user_id);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.tg_crm_set_updated_at();

-- ---------------------------------------------------------
-- 2. Personnes / membres (carnet interne)
-- ---------------------------------------------------------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  avatar text,
  role text,
  is_self boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_user_name_idx
  on public.people (user_id, name);

create unique index if not exists people_one_self_per_user_idx
  on public.people (user_id)
  where is_self;

alter table public.people enable row level security;

drop policy if exists "People readable by owner" on public.people;
create policy "People readable by owner"
  on public.people for select using (auth.uid() = user_id);

drop policy if exists "People insertable by owner" on public.people;
create policy "People insertable by owner"
  on public.people for insert with check (auth.uid() = user_id);

drop policy if exists "People updatable by owner" on public.people;
create policy "People updatable by owner"
  on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "People deletable by owner" on public.people;
create policy "People deletable by owner"
  on public.people for delete using (auth.uid() = user_id);

drop trigger if exists people_updated_at on public.people;
create trigger people_updated_at
  before update on public.people
  for each row execute function public.tg_crm_set_updated_at();

-- ---------------------------------------------------------
-- 3. Prospects — colonnes + nouveaux statuts
-- ---------------------------------------------------------
alter table public.prospects
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists assigned_to uuid references public.people(id) on delete set null,
  add column if not exists potential_value numeric(12,2),
  add column if not exists contact_channel text,
  add column if not exists tags text[] not null default '{}';

create index if not exists prospects_user_project_idx
  on public.prospects (user_id, project_id);
create index if not exists prospects_user_assigned_idx
  on public.prospects (user_id, assigned_to);
create index if not exists prospects_tags_gin_idx
  on public.prospects using gin (tags);

-- Migrer les anciens statuts vers le nouveau pipeline
alter table public.prospects drop constraint if exists prospects_status_check;

update public.prospects set status = case status
  when 'Relance 1' then 'Contacté'
  when 'Relance 2' then 'Contacté'
  when 'Démonstration' then
    case
      when demo_at is not null and demo_at < now() then 'Démo faite'
      else 'Démo prévue'
    end
  when 'Refus' then 'Refusé'
  when 'Pas intéressé' then 'Refusé'
  else status
end
where status in (
  'Relance 1', 'Relance 2', 'Démonstration', 'Refus', 'Pas intéressé'
);

update public.prospects
set status = 'À contacter'
where status not in (
  'À contacter', 'Contacté', 'Répondu', 'Démo prévue',
  'Démo faite', 'Négociation', 'Client', 'Refusé'
);

alter table public.prospects
  alter column status set default 'À contacter';

alter table public.prospects
  add constraint prospects_status_check
  check (status in (
    'À contacter',
    'Contacté',
    'Répondu',
    'Démo prévue',
    'Démo faite',
    'Négociation',
    'Client',
    'Refusé'
  ));

-- ---------------------------------------------------------
-- 4. Activités prospects — interactions manuelles
-- ---------------------------------------------------------
alter table public.prospect_activities
  add column if not exists occurred_at timestamptz,
  add column if not exists actor_name text;

update public.prospect_activities
set occurred_at = created_at
where occurred_at is null;

alter table public.prospect_activities
  alter column occurred_at set default now();

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
    'meeting',
    'demo',
    'other'
  ));

create index if not exists prospect_activities_occurred_idx
  on public.prospect_activities (prospect_id, occurred_at desc);

-- ---------------------------------------------------------
-- 5. Tâches — vraie entité (table daily_tasks conservée)
-- ---------------------------------------------------------
alter table public.daily_tasks
  add column if not exists description text,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists assigned_to uuid references public.people(id) on delete set null,
  add column if not exists due_time time,
  add column if not exists priority text not null default 'Normale',
  add column if not exists status text not null default 'À faire',
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.daily_tasks
set status = 'Terminé',
    priority = coalesce(nullif(priority, ''), 'Normale')
where completed = true and status is distinct from 'Terminé';

do $$
begin
  alter table public.daily_tasks drop constraint if exists daily_tasks_priority_check;
  alter table public.daily_tasks
    add constraint daily_tasks_priority_check
    check (priority in ('Faible', 'Normale', 'Haute', 'Urgente'));
exception when others then null;
end $$;

do $$
begin
  alter table public.daily_tasks drop constraint if exists daily_tasks_status_check;
  alter table public.daily_tasks
    add constraint daily_tasks_status_check
    check (status in ('À faire', 'En cours', 'Bloqué', 'Terminé'));
exception when others then null;
end $$;

create index if not exists daily_tasks_user_status_due_idx
  on public.daily_tasks (user_id, status, due_date);
create index if not exists daily_tasks_user_project_idx
  on public.daily_tasks (user_id, project_id);

create or replace function public.tg_tasks_sync_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Terminé' then
    new.completed := true;
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  elsif new.completed = true then
    new.status := 'Terminé';
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed := false;
    if tg_op = 'UPDATE' and old.status = 'Terminé' and new.status is distinct from 'Terminé' then
      new.completed_at := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_tasks_sync_status on public.daily_tasks;
create trigger daily_tasks_sync_status
  before insert or update on public.daily_tasks
  for each row execute function public.tg_tasks_sync_status();

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.daily_tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists task_subtasks_task_idx
  on public.task_subtasks (task_id, position);

alter table public.task_subtasks enable row level security;

drop policy if exists "Subtasks readable by owner" on public.task_subtasks;
create policy "Subtasks readable by owner"
  on public.task_subtasks for select using (auth.uid() = user_id);

drop policy if exists "Subtasks insertable by owner" on public.task_subtasks;
create policy "Subtasks insertable by owner"
  on public.task_subtasks for insert with check (auth.uid() = user_id);

drop policy if exists "Subtasks updatable by owner" on public.task_subtasks;
create policy "Subtasks updatable by owner"
  on public.task_subtasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Subtasks deletable by owner" on public.task_subtasks;
create policy "Subtasks deletable by owner"
  on public.task_subtasks for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 6. Finances — dépenses, parts, remboursements, abonnements
-- ---------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'CHF',
  project_id uuid references public.projects(id) on delete set null,
  category text not null default 'Autre'
    check (category in (
      'SaaS', 'API', 'Hébergement', 'Domaine', 'Marketing',
      'Matériel', 'Déplacement', 'Autre'
    )),
  paid_by uuid references public.people(id) on delete set null,
  split_method text not null default 'equal'
    check (split_method in ('equal', 'custom')),
  expense_date date not null default (timezone('utc', now()))::date,
  receipt_url text,
  is_recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, expense_date desc);
create index if not exists expenses_user_project_idx
  on public.expenses (user_id, project_id);

alter table public.expenses enable row level security;

drop policy if exists "Expenses readable by owner" on public.expenses;
create policy "Expenses readable by owner"
  on public.expenses for select using (auth.uid() = user_id);

drop policy if exists "Expenses insertable by owner" on public.expenses;
create policy "Expenses insertable by owner"
  on public.expenses for insert with check (auth.uid() = user_id);

drop policy if exists "Expenses updatable by owner" on public.expenses;
create policy "Expenses updatable by owner"
  on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Expenses deletable by owner" on public.expenses;
create policy "Expenses deletable by owner"
  on public.expenses for delete using (auth.uid() = user_id);

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.tg_crm_set_updated_at();

create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  unique (expense_id, person_id)
);

create index if not exists expense_shares_expense_idx
  on public.expense_shares (expense_id);
create index if not exists expense_shares_person_idx
  on public.expense_shares (user_id, person_id);

alter table public.expense_shares enable row level security;

drop policy if exists "Shares readable by owner" on public.expense_shares;
create policy "Shares readable by owner"
  on public.expense_shares for select using (auth.uid() = user_id);

drop policy if exists "Shares insertable by owner" on public.expense_shares;
create policy "Shares insertable by owner"
  on public.expense_shares for insert with check (auth.uid() = user_id);

drop policy if exists "Shares updatable by owner" on public.expense_shares;
create policy "Shares updatable by owner"
  on public.expense_shares for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Shares deletable by owner" on public.expense_shares;
create policy "Shares deletable by owner"
  on public.expense_shares for delete using (auth.uid() = user_id);

create table if not exists public.finance_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_person_id uuid not null references public.people(id) on delete restrict,
  to_person_id uuid not null references public.people(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'CHF',
  notes text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (from_person_id <> to_person_id)
);

create index if not exists finance_settlements_user_idx
  on public.finance_settlements (user_id, settled_at desc);

alter table public.finance_settlements enable row level security;

drop policy if exists "Settlements readable by owner" on public.finance_settlements;
create policy "Settlements readable by owner"
  on public.finance_settlements for select using (auth.uid() = user_id);

drop policy if exists "Settlements insertable by owner" on public.finance_settlements;
create policy "Settlements insertable by owner"
  on public.finance_settlements for insert with check (auth.uid() = user_id);

drop policy if exists "Settlements deletable by owner" on public.finance_settlements;
create policy "Settlements deletable by owner"
  on public.finance_settlements for delete using (auth.uid() = user_id);

create table if not exists public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'CHF',
  frequency text not null default 'monthly'
    check (frequency in ('monthly', 'yearly', 'custom')),
  interval_days integer check (interval_days is null or interval_days >= 1),
  paid_by uuid references public.people(id) on delete set null,
  next_renewal date,
  category text not null default 'SaaS'
    check (category in (
      'SaaS', 'API', 'Hébergement', 'Domaine', 'Marketing',
      'Matériel', 'Déplacement', 'Autre'
    )),
  status text not null default 'active'
    check (status in ('active', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_subscriptions_user_status_idx
  on public.finance_subscriptions (user_id, status, next_renewal);

alter table public.finance_subscriptions enable row level security;

drop policy if exists "Subscriptions readable by owner" on public.finance_subscriptions;
create policy "Subscriptions readable by owner"
  on public.finance_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Subscriptions insertable by owner" on public.finance_subscriptions;
create policy "Subscriptions insertable by owner"
  on public.finance_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "Subscriptions updatable by owner" on public.finance_subscriptions;
create policy "Subscriptions updatable by owner"
  on public.finance_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Subscriptions deletable by owner" on public.finance_subscriptions;
create policy "Subscriptions deletable by owner"
  on public.finance_subscriptions for delete using (auth.uid() = user_id);

drop trigger if exists finance_subscriptions_updated_at on public.finance_subscriptions;
create trigger finance_subscriptions_updated_at
  before update on public.finance_subscriptions
  for each row execute function public.tg_crm_set_updated_at();

-- ---------------------------------------------------------
-- 7. Notes
-- ---------------------------------------------------------
create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_notes_user_updated_idx
  on public.workspace_notes (user_id, updated_at desc);
create index if not exists workspace_notes_user_project_idx
  on public.workspace_notes (user_id, project_id);

alter table public.workspace_notes enable row level security;

drop policy if exists "Notes readable by owner" on public.workspace_notes;
create policy "Notes readable by owner"
  on public.workspace_notes for select using (auth.uid() = user_id);

drop policy if exists "Notes insertable by owner" on public.workspace_notes;
create policy "Notes insertable by owner"
  on public.workspace_notes for insert with check (auth.uid() = user_id);

drop policy if exists "Notes updatable by owner" on public.workspace_notes;
create policy "Notes updatable by owner"
  on public.workspace_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Notes deletable by owner" on public.workspace_notes;
create policy "Notes deletable by owner"
  on public.workspace_notes for delete using (auth.uid() = user_id);

drop trigger if exists workspace_notes_updated_at on public.workspace_notes;
create trigger workspace_notes_updated_at
  before update on public.workspace_notes
  for each row execute function public.tg_crm_set_updated_at();

-- ---------------------------------------------------------
-- 8. Fil d'activité
-- ---------------------------------------------------------
create table if not exists public.workspace_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  event_type text not null,
  title text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists workspace_events_user_created_idx
  on public.workspace_events (user_id, created_at desc);
create index if not exists workspace_events_project_idx
  on public.workspace_events (project_id, created_at desc);

alter table public.workspace_events enable row level security;

drop policy if exists "Events readable by owner" on public.workspace_events;
create policy "Events readable by owner"
  on public.workspace_events for select using (auth.uid() = user_id);

drop policy if exists "Events insertable by owner" on public.workspace_events;
create policy "Events insertable by owner"
  on public.workspace_events for insert with check (auth.uid() = user_id);

drop policy if exists "Events deletable by owner" on public.workspace_events;
create policy "Events deletable by owner"
  on public.workspace_events for delete using (auth.uid() = user_id);
