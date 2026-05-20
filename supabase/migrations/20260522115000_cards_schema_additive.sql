-- Tables cartes — création additive si absentes (aucune suppression de données)

create table if not exists public.cards (
  id text primary key,
  name text not null,
  description text not null,
  effect_type text not null,
  rarity text default 'common' not null,
  icon text default 'card' not null,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create table if not exists public.card_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  quantity integer default 0 not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  unique (user_id, league_id, card_id)
);

create index if not exists card_inventory_user_league_idx
  on public.card_inventory(user_id, league_id);

create table if not exists public.card_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  payload jsonb default '{}'::jsonb not null,
  status text default 'played' not null,
  played_at timestamptz default timezone('utc', now()) not null
);

create unique index if not exists card_plays_one_per_match_idx
  on public.card_plays(user_id, league_id, match_id);

create index if not exists card_plays_match_idx on public.card_plays(match_id);
create index if not exists card_plays_league_idx on public.card_plays(league_id);

alter table public.cards enable row level security;
alter table public.card_inventory enable row level security;
alter table public.card_plays enable row level security;
