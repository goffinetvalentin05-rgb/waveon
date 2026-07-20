-- =========================================================
-- CRM Prospection — schéma personnel (Obillz)
-- =========================================================

create extension if not exists pgcrypto;

-- Table prospects (création si absente)
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  club_name text,
  sport text,
  canton text,
  contact_name text,
  phone text,
  email text,
  website text,
  status text not null default 'À contacter',
  last_action text,
  last_action_at timestamptz,
  next_follow_up date,
  notes text,
  demo_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects
  add column if not exists club_name text,
  add column if not exists sport text,
  add column if not exists canton text,
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists last_action text,
  add column if not exists last_action_at timestamptz,
  add column if not exists next_follow_up date,
  add column if not exists notes text,
  add column if not exists demo_at timestamptz;

-- Migrer l'ancien champ name → club_name
update public.prospects
set club_name = coalesce(nullif(club_name, ''), nullif(name, ''), 'Sans nom')
where club_name is null or club_name = '';

alter table public.prospects
  alter column club_name set not null;

do $$
begin
  alter table public.prospects alter column name drop not null;
exception when others then null;
end $$;

do $$
begin
  alter table public.prospects alter column phone drop not null;
exception when others then null;
end $$;

-- Remplacer la contrainte de statut
alter table public.prospects drop constraint if exists prospects_status_check;

update public.prospects
set status = case status
  when 'Nouveau' then 'À contacter'
  when 'En conversation' then 'Contacté'
  when 'Appel booké' then 'Démonstration'
  when 'Closé' then 'Client'
  else coalesce(nullif(status, ''), 'À contacter')
end;

-- Normaliser les statuts hors liste
update public.prospects
set status = 'À contacter'
where status not in (
  'À contacter', 'Contacté', 'Relance 1', 'Relance 2',
  'Démonstration', 'Client', 'Refus'
);

alter table public.prospects
  alter column status set default 'À contacter';

alter table public.prospects
  add constraint prospects_status_check
  check (status in (
    'À contacter',
    'Contacté',
    'Relance 1',
    'Relance 2',
    'Démonstration',
    'Client',
    'Refus'
  ));

create index if not exists prospects_user_id_created_at_idx
  on public.prospects(user_id, created_at desc);
create index if not exists prospects_user_status_idx
  on public.prospects(user_id, status);
create index if not exists prospects_user_next_follow_up_idx
  on public.prospects(user_id, next_follow_up);
create index if not exists prospects_user_club_name_idx
  on public.prospects(user_id, club_name);

alter table public.prospects enable row level security;

drop policy if exists "Prospects are readable by owner" on public.prospects;
create policy "Prospects are readable by owner"
  on public.prospects for select using (auth.uid() = user_id);

drop policy if exists "Prospects are insertable by owner" on public.prospects;
create policy "Prospects are insertable by owner"
  on public.prospects for insert with check (auth.uid() = user_id);

drop policy if exists "Prospects are updatable by owner" on public.prospects;
create policy "Prospects are updatable by owner"
  on public.prospects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Prospects are deletable by owner" on public.prospects;
create policy "Prospects are deletable by owner"
  on public.prospects for delete using (auth.uid() = user_id);

-- Historique
create table if not exists public.prospect_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  action_type text not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint prospect_activities_action_type_check
    check (action_type in (
      'mail_sent', 'call_made', 'demo_scheduled', 'client', 'refus',
      'note', 'status_change', 'imported', 'created'
    ))
);

create index if not exists prospect_activities_prospect_created_idx
  on public.prospect_activities(prospect_id, created_at desc);
create index if not exists prospect_activities_user_created_idx
  on public.prospect_activities(user_id, created_at desc);

alter table public.prospect_activities enable row level security;

drop policy if exists "Activities readable by owner" on public.prospect_activities;
create policy "Activities readable by owner"
  on public.prospect_activities for select using (auth.uid() = user_id);

drop policy if exists "Activities insertable by owner" on public.prospect_activities;
create policy "Activities insertable by owner"
  on public.prospect_activities for insert with check (auth.uid() = user_id);

drop policy if exists "Activities deletable by owner" on public.prospect_activities;
create policy "Activities deletable by owner"
  on public.prospect_activities for delete using (auth.uid() = user_id);

-- Tâches du jour
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  title text not null,
  due_date date not null default (timezone('utc', now()))::date,
  completed boolean not null default false,
  task_kind text not null default 'follow_up',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint daily_tasks_kind_check
    check (task_kind in ('follow_up', 'first_contact', 'demo', 'custom'))
);

create index if not exists daily_tasks_user_due_idx
  on public.daily_tasks(user_id, due_date, completed);

alter table public.daily_tasks enable row level security;

drop policy if exists "Tasks readable by owner" on public.daily_tasks;
create policy "Tasks readable by owner"
  on public.daily_tasks for select using (auth.uid() = user_id);

drop policy if exists "Tasks insertable by owner" on public.daily_tasks;
create policy "Tasks insertable by owner"
  on public.daily_tasks for insert with check (auth.uid() = user_id);

drop policy if exists "Tasks updatable by owner" on public.daily_tasks;
create policy "Tasks updatable by owner"
  on public.daily_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Tasks deletable by owner" on public.daily_tasks;
create policy "Tasks deletable by owner"
  on public.daily_tasks for delete using (auth.uid() = user_id);

-- Paramètres
create table if not exists public.crm_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  delay_relance_1_days integer not null default 3
    check (delay_relance_1_days >= 1 and delay_relance_1_days <= 90),
  delay_relance_2_days integer not null default 7
    check (delay_relance_2_days >= 1 and delay_relance_2_days <= 90),
  delay_relance_3_days integer not null default 14
    check (delay_relance_3_days >= 1 and delay_relance_3_days <= 90),
  updated_at timestamptz not null default now()
);

alter table public.crm_settings enable row level security;

drop policy if exists "Settings readable by owner" on public.crm_settings;
create policy "Settings readable by owner"
  on public.crm_settings for select using (auth.uid() = user_id);

drop policy if exists "Settings insertable by owner" on public.crm_settings;
create policy "Settings insertable by owner"
  on public.crm_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Settings updatable by owner" on public.crm_settings;
create policy "Settings updatable by owner"
  on public.crm_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.tg_crm_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prospects_crm_updated_at on public.prospects;
create trigger prospects_crm_updated_at
  before update on public.prospects
  for each row execute function public.tg_crm_set_updated_at();

drop trigger if exists crm_settings_updated_at on public.crm_settings;
create trigger crm_settings_updated_at
  before update on public.crm_settings
  for each row execute function public.tg_crm_set_updated_at();
