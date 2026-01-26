create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  slug text unique not null,
  business_name text not null,
  logo_url text,
  google_review_url text not null,
  instagram_url text not null,
  win_ratio int not null default 10,
  created_at timestamptz default now()
);

create table if not exists public.rewards (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  label text not null,
  created_at timestamptz default now()
);

do $$ begin
  create type public.participation_result as enum ('win', 'lose');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.participations (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_at timestamptz default now(),
  event_type text not null default 'play',
  did_review boolean default false,
  did_follow boolean default false,
  result public.participation_result,
  prize text
);

alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.rewards enable row level security;
alter table public.participations enable row level security;

create policy "Users can read their profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Campaigns are public readable"
  on public.campaigns for select
  using (true);

create policy "Owners manage campaigns"
  on public.campaigns for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Rewards are public readable"
  on public.rewards for select
  using (true);

create policy "Owners manage rewards"
  on public.rewards for all
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = rewards.campaign_id
      and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = rewards.campaign_id
      and c.owner_id = auth.uid()
    )
  );

create policy "Public can insert participations"
  on public.participations for insert
  with check (true);

create policy "Owners can read participations"
  on public.participations for select
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = participations.campaign_id
      and c.owner_id = auth.uid()
    )
  );

