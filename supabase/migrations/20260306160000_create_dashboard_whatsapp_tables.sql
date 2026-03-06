create extension if not exists pgcrypto;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  status text not null default 'Nouveau',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospects_status_check
    check (status in ('Nouveau', 'En conversation', 'Appel booké', 'Closé'))
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  status text not null default 'booked',
  scheduled_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists status text default 'Nouveau',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.conversations
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null,
  add column if not exists messages jsonb default '[]'::jsonb,
  add column if not exists last_message text,
  add column if not exists last_message_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null,
  add column if not exists status text default 'booked',
  add column if not exists scheduled_at timestamptz default now(),
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.prospects
set status = 'Nouveau'
where status is null;

update public.conversations
set messages = '[]'::jsonb
where messages is null;

update public.prospects
set created_at = now()
where created_at is null;

update public.prospects
set updated_at = now()
where updated_at is null;

update public.conversations
set created_at = now()
where created_at is null;

update public.conversations
set updated_at = now()
where updated_at is null;

update public.bookings
set scheduled_at = now()
where scheduled_at is null;

update public.bookings
set created_at = now()
where created_at is null;

update public.bookings
set updated_at = now()
where updated_at is null;

create index if not exists prospects_user_id_created_at_idx
  on public.prospects(user_id, created_at desc);
create index if not exists conversations_user_id_updated_at_idx
  on public.conversations(user_id, updated_at desc);
create index if not exists conversations_prospect_id_idx
  on public.conversations(prospect_id);
create index if not exists bookings_user_id_scheduled_at_idx
  on public.bookings(user_id, scheduled_at desc);
create index if not exists bookings_prospect_id_idx
  on public.bookings(prospect_id);

alter table public.prospects enable row level security;
alter table public.conversations enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Prospects are readable by owner" on public.prospects;
create policy "Prospects are readable by owner"
  on public.prospects
  for select
  using (auth.uid() = user_id);

drop policy if exists "Prospects are insertable by owner" on public.prospects;
create policy "Prospects are insertable by owner"
  on public.prospects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Prospects are updatable by owner" on public.prospects;
create policy "Prospects are updatable by owner"
  on public.prospects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Prospects are deletable by owner" on public.prospects;
create policy "Prospects are deletable by owner"
  on public.prospects
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Conversations are readable by owner" on public.conversations;
create policy "Conversations are readable by owner"
  on public.conversations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Conversations are insertable by owner" on public.conversations;
create policy "Conversations are insertable by owner"
  on public.conversations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Conversations are updatable by owner" on public.conversations;
create policy "Conversations are updatable by owner"
  on public.conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Conversations are deletable by owner" on public.conversations;
create policy "Conversations are deletable by owner"
  on public.conversations
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Bookings are readable by owner" on public.bookings;
create policy "Bookings are readable by owner"
  on public.bookings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Bookings are insertable by owner" on public.bookings;
create policy "Bookings are insertable by owner"
  on public.bookings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Bookings are updatable by owner" on public.bookings;
create policy "Bookings are updatable by owner"
  on public.bookings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Bookings are deletable by owner" on public.bookings;
create policy "Bookings are deletable by owner"
  on public.bookings
  for delete
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'prospects'
  ) then
    alter publication supabase_realtime add table public.prospects;
  end if;
exception
  when undefined_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
exception
  when undefined_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception
  when undefined_object then null;
end $$;
