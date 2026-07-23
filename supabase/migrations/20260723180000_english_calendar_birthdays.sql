-- =========================================================
-- Workspace modules: English + Calendar + Birthdays
-- =========================================================

-- Shared updated_at helper (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- English vocabulary
-- ---------------------------------------------------------
create table if not exists public.english_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('word', 'expression', 'sentence')),
  english_text text not null,
  french_translation text not null,
  example_english text,
  example_french text,
  category text,
  personal_note text,
  status text not null default 'new'
    check (status in ('new', 'learning', 'known', 'review', 'archived')),
  review_level integer not null default 0 check (review_level >= 0),
  next_review_at date not null default (current_date),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists english_entries_user_id_idx
  on public.english_entries (user_id);
create index if not exists english_entries_user_next_review_idx
  on public.english_entries (user_id, next_review_at)
  where status <> 'archived';
create index if not exists english_entries_user_status_idx
  on public.english_entries (user_id, status);
create index if not exists english_entries_user_category_idx
  on public.english_entries (user_id, category);

drop trigger if exists english_entries_set_updated_at on public.english_entries;
create trigger english_entries_set_updated_at
  before update on public.english_entries
  for each row execute function public.set_updated_at();

alter table public.english_entries enable row level security;

drop policy if exists "english_entries_select_own" on public.english_entries;
create policy "english_entries_select_own"
  on public.english_entries for select
  using (auth.uid() = user_id);

drop policy if exists "english_entries_insert_own" on public.english_entries;
create policy "english_entries_insert_own"
  on public.english_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "english_entries_update_own" on public.english_entries;
create policy "english_entries_update_own"
  on public.english_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "english_entries_delete_own" on public.english_entries;
create policy "english_entries_delete_own"
  on public.english_entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Calendar events
-- ---------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'other'
    check (category in (
      'appointment', 'demo', 'room', 'personal_task', 'birthday', 'other'
    )),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  description text,
  color text not null default '#2563eb',
  location text,
  source text,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_check check (end_at >= start_at)
);

create index if not exists calendar_events_user_start_idx
  on public.calendar_events (user_id, start_at);
create index if not exists calendar_events_user_range_idx
  on public.calendar_events (user_id, start_at, end_at);
create unique index if not exists calendar_events_crm_source_unique
  on public.calendar_events (user_id, source, source_id)
  where source is not null and source_id is not null;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
  on public.calendar_events for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Birthdays (recurring yearly)
-- ---------------------------------------------------------
create table if not exists public.birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  birth_date date not null,
  note text,
  remind_day_before boolean not null default true,
  remind_same_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birthdays_user_id_idx
  on public.birthdays (user_id);

drop trigger if exists birthdays_set_updated_at on public.birthdays;
create trigger birthdays_set_updated_at
  before update on public.birthdays
  for each row execute function public.set_updated_at();

alter table public.birthdays enable row level security;

drop policy if exists "birthdays_select_own" on public.birthdays;
create policy "birthdays_select_own"
  on public.birthdays for select
  using (auth.uid() = user_id);

drop policy if exists "birthdays_insert_own" on public.birthdays;
create policy "birthdays_insert_own"
  on public.birthdays for insert
  with check (auth.uid() = user_id);

drop policy if exists "birthdays_update_own" on public.birthdays;
create policy "birthdays_update_own"
  on public.birthdays for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "birthdays_delete_own" on public.birthdays;
create policy "birthdays_delete_own"
  on public.birthdays for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Birthday reminder logs (dedupe)
-- ---------------------------------------------------------
create table if not exists public.birthday_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  birthday_id uuid not null references public.birthdays(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('day_before', 'same_day')),
  sent_for_date date not null,
  sent_at timestamptz not null default now(),
  unique (birthday_id, reminder_type, sent_for_date)
);

create index if not exists birthday_reminder_logs_birthday_idx
  on public.birthday_reminder_logs (birthday_id);

alter table public.birthday_reminder_logs enable row level security;

-- Users can read their own logs (via birthday ownership)
drop policy if exists "birthday_reminder_logs_select_own" on public.birthday_reminder_logs;
create policy "birthday_reminder_logs_select_own"
  on public.birthday_reminder_logs for select
  using (
    exists (
      select 1 from public.birthdays b
      where b.id = birthday_id and b.user_id = auth.uid()
    )
  );

-- Inserts/updates primarily via service role (cron). Allow owner insert for safety.
drop policy if exists "birthday_reminder_logs_insert_own" on public.birthday_reminder_logs;
create policy "birthday_reminder_logs_insert_own"
  on public.birthday_reminder_logs for insert
  with check (
    exists (
      select 1 from public.birthdays b
      where b.id = birthday_id and b.user_id = auth.uid()
    )
  );

-- User preferences (timezone for reminders)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Zurich',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
