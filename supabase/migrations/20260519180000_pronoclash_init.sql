-- =====================================================================
--  Prono Clash — Migration d'initialisation (v2, tournoi mondial 2026)
--
--  SÉCURITÉ DONNÉES (production) :
--    - AUCUN DROP TABLE / TRUNCATE / DELETE sur données métier
--    - Ne modifie jamais is_admin sur les profils existants
--    - Ne touche pas aux matchs importés (Sportmonks) ni aux paiements
--    - CREATE TABLE / INDEX IF NOT EXISTS uniquement
--    - Seeds groupes/équipes : ON CONFLICT DO NOTHING uniquement
--
--  Ne pas utiliser `supabase db reset` sur la base de production.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3) Utilitaires
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) Profils (étend auth.users)
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  avatar_color text default 'indigo' not null,
  is_admin boolean default false not null,
  total_points integer default 0 not null,
  -- Consentements RGPD / LPD (jamais mélangés)
  consent_terms_required boolean default false not null,
  consent_contest_rules_required boolean default false not null,
  consent_marketing_app boolean default false not null,
  consent_partner_offers boolean default false not null,
  consent_created_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_total_points_idx on public.profiles(total_points desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-création du profil au signup Supabase
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper RLS : utilisateur courant admin ?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- 5) App settings (kv simple)
-- ---------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default timezone('utc', now()) not null
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.tg_set_updated_at();

insert into public.app_settings(key, value) values
  ('tournament', jsonb_build_object(
    'name', 'Tournoi mondial de foot 2026',
    'season', '2026'
  ))
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 6) Groupes du tournoi (A à L)
-- ---------------------------------------------------------------------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ---------------------------------------------------------------------
-- 7) Équipes
-- ---------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  country_code text,
  flag_emoji text,
  group_name text references public.groups(name) on delete set null,
  display_order integer default 0 not null,
  is_outsider boolean default false not null,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists teams_group_idx on public.teams(group_name);
create index if not exists teams_country_code_idx on public.teams(country_code);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 8) Matchs
-- ---------------------------------------------------------------------

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer unique,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_placeholder text,
  away_placeholder text,
  stage text not null default 'group',
  group_name text references public.groups(name) on delete set null,
  venue text,
  city text,
  country text,
  kickoff_at timestamptz not null,
  locked_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled, live, finished, postponed
  home_score integer,
  away_score integer,
  winner_team_id uuid references public.teams(id) on delete set null,
  is_draw boolean default false not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists matches_kickoff_idx on public.matches(kickoff_at);
create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_stage_idx on public.matches(stage);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 9) Ligues
-- ---------------------------------------------------------------------

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'private', -- global, private, pro
  owner_id uuid references auth.users(id) on delete set null,
  plan text, -- 'private' | 'pro' (nullable pour la ligue globale)
  max_players integer default 20 not null,
  invite_code text unique,
  status text default 'active' not null, -- pending, active, archived
  paid_at timestamptz,
  stripe_session_id text,
  amount_chf numeric(10,2),
  settings jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists leagues_owner_idx on public.leagues(owner_id);
create index if not exists leagues_kind_idx on public.leagues(kind);
create index if not exists leagues_invite_code_idx on public.leagues(invite_code);

create trigger leagues_set_updated_at
  before update on public.leagues
  for each row execute function public.tg_set_updated_at();

-- Ligue globale unique
insert into public.leagues (slug, name, kind, status, max_players)
values ('global', 'Ligue générale', 'global', 'active', 1000000)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 10) Membres de ligues
-- ---------------------------------------------------------------------

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member' not null, -- member, owner
  points integer default 0 not null,
  joined_at timestamptz default timezone('utc', now()) not null,
  unique(league_id, user_id)
);

create index if not exists league_members_league_idx on public.league_members(league_id);
create index if not exists league_members_user_idx on public.league_members(user_id);
create index if not exists league_members_points_idx on public.league_members(league_id, points desc);

-- Helper RLS : utilisateur membre d'une ligue ?
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 11) Pronostics
-- ---------------------------------------------------------------------

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  predicted_winner_team_id uuid references public.teams(id) on delete set null,
  predicted_is_draw boolean default false not null,
  joker_x2 boolean default false not null,
  points integer default 0 not null,
  exact_score boolean default false not null,
  correct_winner boolean default false not null,
  correct_goal_difference boolean default false not null,
  is_locked boolean default false not null,
  locked_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  unique (user_id, league_id, match_id)
);

-- Pour les pronostics globaux (league_id NULL), un seul par user/match
create unique index if not exists predictions_user_match_global_idx
  on public.predictions(user_id, match_id)
  where league_id is null;

create index if not exists predictions_match_idx on public.predictions(match_id);
create index if not exists predictions_league_idx on public.predictions(league_id);
create index if not exists predictions_user_idx on public.predictions(user_id);

create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 12) Évènements de scoring (audit)
-- ---------------------------------------------------------------------

create table if not exists public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists scoring_events_user_idx on public.scoring_events(user_id);
create index if not exists scoring_events_match_idx on public.scoring_events(match_id);
create index if not exists scoring_events_league_idx on public.scoring_events(league_id);

-- ---------------------------------------------------------------------
-- 13) Cartes (catalogue)
-- ---------------------------------------------------------------------

create table if not exists public.cards (
  id text primary key, -- slug stable (joker_x2, vol_score, ...)
  name text not null,
  description text not null,
  effect_type text not null, -- self, target, locked_target, defensive...
  rarity text default 'common' not null,
  icon text default 'card' not null,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc', now()) not null
);

insert into public.cards (id, name, description, effect_type, rarity, icon, is_active) values
  ('joker_x2',     'Joker x2',     'Double tes points sur ce match.',                                'self',           'common',   'spark',  true),
  ('vol_score',    'Vol de score', 'Copie le pronostic d''un autre joueur avant verrouillage.',     'target',         'rare',     'swap',   true),
  ('carton_rouge', 'Carton rouge', 'Empêche un joueur ciblé de modifier son prono.',                'target',         'epic',     'card',   true),
  ('tacle_glisse', 'Tacle glissé', 'Vole 2 points à un joueur si tu finis avec plus de points que lui sur ce match.', 'target', 'rare', 'tackle', true),
  ('var',          'VAR',          'Te permet de modifier ton prono jusqu''à une limite spéciale après le coup d''envoi.', 'self', 'legendary', 'eye', true),
  ('bus_gare',     'Bus garé',     'Bonus si tu pronostiques un match nul et que le résultat est bien nul.', 'self',    'common',   'shield', false),
  ('hold_up',      'Hold-up',      'Bonus si l''équipe choisie gagne avec exactement un but d''écart.', 'self',         'common',   'crown',  false),
  ('outsider',    'Outsider',      'Bonus si tu pronostiques correctement la victoire d''un outsider.', 'self',          'common',   'star',   false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 14) Inventaire de cartes
-- ---------------------------------------------------------------------

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

create trigger card_inventory_set_updated_at
  before update on public.card_inventory
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 15) Plays (journal des cartes jouées)
-- ---------------------------------------------------------------------

create table if not exists public.card_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  payload jsonb default '{}'::jsonb not null,
  status text default 'played' not null, -- played, applied, refunded
  played_at timestamptz default timezone('utc', now()) not null
);

create unique index if not exists card_plays_one_per_match_idx
  on public.card_plays(user_id, league_id, match_id);

create index if not exists card_plays_match_idx on public.card_plays(match_id);
create index if not exists card_plays_league_idx on public.card_plays(league_id);

-- ---------------------------------------------------------------------
-- 16) Paiements Stripe (one-time)
-- ---------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  league_id uuid references public.leagues(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount_chf numeric(10,2),
  currency text default 'CHF' not null,
  plan text,
  status text default 'pending' not null, -- pending, paid, failed, refunded
  raw jsonb,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 17) Concours global : paramètres + résultats
-- ---------------------------------------------------------------------

create table if not exists public.contest_settings (
  id uuid primary key default gen_random_uuid(),
  prize_title text default 'Maillot de football au choix' not null,
  prize_description text default 'Maillot ou bon équivalent. Valeur maximale CHF 120.' not null,
  prize_value_chf integer default 120 not null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean default true not null,
  rules_url text,
  tie_break_rules jsonb default jsonb_build_array(
    'exact_scores_count',
    'correct_winners_count',
    'predictions_count',
    'manual_draw'
  ) not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create trigger contest_settings_set_updated_at
  before update on public.contest_settings
  for each row execute function public.tg_set_updated_at();

-- Une seule ligne par défaut
insert into public.contest_settings (id) values (gen_random_uuid())
on conflict do nothing;

create table if not exists public.contest_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  global_points integer default 0 not null,
  exact_scores_count integer default 0 not null,
  correct_winners_count integer default 0 not null,
  predictions_count integer default 0 not null,
  rank integer,
  is_winner boolean default false not null,
  winner_selected_manually boolean default false not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  unique(user_id)
);

create index if not exists contest_results_rank_idx on public.contest_results(rank);
create index if not exists contest_results_winner_idx on public.contest_results(is_winner);

create trigger contest_results_set_updated_at
  before update on public.contest_results
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 18) RLS — Activation
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.groups enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.scoring_events enable row level security;
alter table public.cards enable row level security;
alter table public.card_inventory enable row level security;
alter table public.card_plays enable row level security;
alter table public.payments enable row level security;
alter table public.contest_settings enable row level security;
alter table public.contest_results enable row level security;

-- ---------- profiles ----------
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles public minimal read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles admin all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- app_settings ----------
create policy "app_settings read auth"
  on public.app_settings for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "app_settings admin write"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- groups ----------
create policy "groups read all"
  on public.groups for select
  using (true);

create policy "groups admin write"
  on public.groups for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- teams ----------
create policy "teams read all"
  on public.teams for select
  using (true);

create policy "teams admin write"
  on public.teams for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- matches ----------
create policy "matches read all"
  on public.matches for select
  using (true);

create policy "matches admin write"
  on public.matches for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- leagues ----------
create policy "leagues read members or global"
  on public.leagues for select
  using (
    kind = 'global'
    or owner_id = auth.uid()
    or public.is_league_member(id)
    or public.is_admin()
  );

create policy "leagues owner update"
  on public.leagues for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "leagues admin all"
  on public.leagues for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- league_members ----------
create policy "league_members read members"
  on public.league_members for select
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id)
    or public.is_admin()
  );

create policy "league_members self insert"
  on public.league_members for insert
  with check (user_id = auth.uid());

create policy "league_members admin all"
  on public.league_members for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- predictions ----------
create policy "predictions self read"
  on public.predictions for select
  using (
    user_id = auth.uid()
    or (league_id is not null and public.is_league_member(league_id))
    or public.is_admin()
  );

create policy "predictions self insert"
  on public.predictions for insert
  with check (user_id = auth.uid());

create policy "predictions self update"
  on public.predictions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "predictions admin all"
  on public.predictions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- scoring_events ----------
create policy "scoring_events self read"
  on public.scoring_events for select
  using (user_id = auth.uid() or public.is_admin());

create policy "scoring_events admin write"
  on public.scoring_events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- cards (catalogue) ----------
create policy "cards read all"
  on public.cards for select
  using (true);

create policy "cards admin write"
  on public.cards for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- card_inventory ----------
create policy "card_inventory self read"
  on public.card_inventory for select
  using (user_id = auth.uid() or public.is_admin());

create policy "card_inventory admin write"
  on public.card_inventory for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- card_plays ----------
create policy "card_plays read members"
  on public.card_plays for select
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id)
    or public.is_admin()
  );

create policy "card_plays self insert"
  on public.card_plays for insert
  with check (user_id = auth.uid());

create policy "card_plays admin write"
  on public.card_plays for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- payments ----------
create policy "payments self read"
  on public.payments for select
  using (user_id = auth.uid() or public.is_admin());

create policy "payments admin write"
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- contest_settings ----------
create policy "contest_settings read all"
  on public.contest_settings for select
  using (true);

create policy "contest_settings admin write"
  on public.contest_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- contest_results ----------
create policy "contest_results self read"
  on public.contest_results for select
  using (user_id = auth.uid() or public.is_admin());

create policy "contest_results public top read"
  on public.contest_results for select
  using (auth.role() = 'authenticated');

create policy "contest_results admin write"
  on public.contest_results for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 19) Seed des 12 groupes
-- ---------------------------------------------------------------------

insert into public.groups (name, display_order) values
  ('A', 1), ('B', 2), ('C', 3), ('D', 4),
  ('E', 5), ('F', 6), ('G', 7), ('H', 8),
  ('I', 9), ('J', 10), ('K', 11), ('L', 12)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 20) Seed des 48 équipes du tournoi mondial 2026
-- ---------------------------------------------------------------------

insert into public.teams (name, slug, country_code, flag_emoji, group_name, display_order, is_active) values
  -- Group A
  ('Mexico', 'mexico', 'MEX', '🇲🇽', 'A', 1, true),
  ('South Africa', 'south-africa', 'RSA', '🇿🇦', 'A', 2, true),
  ('Korea Republic', 'korea-republic', 'KOR', '🇰🇷', 'A', 3, true),
  ('Czechia', 'czechia', 'CZE', '🇨🇿', 'A', 4, true),
  -- Group B
  ('Canada', 'canada', 'CAN', '🇨🇦', 'B', 1, true),
  ('Switzerland', 'switzerland', 'SUI', '🇨🇭', 'B', 2, true),
  ('Qatar', 'qatar', 'QAT', '🇶🇦', 'B', 3, true),
  ('Bosnia and Herzegovina', 'bosnia-and-herzegovina', 'BIH', '🇧🇦', 'B', 4, true),
  -- Group C
  ('Brazil', 'brazil', 'BRA', '🇧🇷', 'C', 1, true),
  ('Morocco', 'morocco', 'MAR', '🇲🇦', 'C', 2, true),
  ('Haiti', 'haiti', 'HAI', '🇭🇹', 'C', 3, true),
  ('Scotland', 'scotland', 'SCO', '🏴', 'C', 4, true),
  -- Group D
  ('United States', 'united-states', 'USA', '🇺🇸', 'D', 1, true),
  ('Australia', 'australia', 'AUS', '🇦🇺', 'D', 2, true),
  ('Paraguay', 'paraguay', 'PAR', '🇵🇾', 'D', 3, true),
  ('Türkiye', 'turkiye', 'TUR', '🇹🇷', 'D', 4, true),
  -- Group E
  ('Germany', 'germany', 'GER', '🇩🇪', 'E', 1, true),
  ('Côte d''Ivoire', 'cote-divoire', 'CIV', '🇨🇮', 'E', 2, true),
  ('Ecuador', 'ecuador', 'ECU', '🇪🇨', 'E', 3, true),
  ('Curaçao', 'curacao', 'CUW', '🇨🇼', 'E', 4, true),
  -- Group F
  ('Netherlands', 'netherlands', 'NED', '🇳🇱', 'F', 1, true),
  ('Japan', 'japan', 'JPN', '🇯🇵', 'F', 2, true),
  ('Sweden', 'sweden', 'SWE', '🇸🇪', 'F', 3, true),
  ('Tunisia', 'tunisia', 'TUN', '🇹🇳', 'F', 4, true),
  -- Group G
  ('Belgium', 'belgium', 'BEL', '🇧🇪', 'G', 1, true),
  ('IR Iran', 'ir-iran', 'IRN', '🇮🇷', 'G', 2, true),
  ('New Zealand', 'new-zealand', 'NZL', '🇳🇿', 'G', 3, true),
  ('Egypt', 'egypt', 'EGY', '🇪🇬', 'G', 4, true),
  -- Group H
  ('Uruguay', 'uruguay', 'URU', '🇺🇾', 'H', 1, true),
  ('Spain', 'spain', 'ESP', '🇪🇸', 'H', 2, true),
  ('Saudi Arabia', 'saudi-arabia', 'KSA', '🇸🇦', 'H', 3, true),
  ('Cabo Verde', 'cabo-verde', 'CPV', '🇨🇻', 'H', 4, true),
  -- Group I
  ('France', 'france', 'FRA', '🇫🇷', 'I', 1, true),
  ('Senegal', 'senegal', 'SEN', '🇸🇳', 'I', 2, true),
  ('Iraq', 'iraq', 'IRQ', '🇮🇶', 'I', 3, true),
  ('Norway', 'norway', 'NOR', '🇳🇴', 'I', 4, true),
  -- Group J
  ('Argentina', 'argentina', 'ARG', '🇦🇷', 'J', 1, true),
  ('Algeria', 'algeria', 'ALG', '🇩🇿', 'J', 2, true),
  ('Austria', 'austria', 'AUT', '🇦🇹', 'J', 3, true),
  ('Jordan', 'jordan', 'JOR', '🇯🇴', 'J', 4, true),
  -- Group K
  ('Portugal', 'portugal', 'POR', '🇵🇹', 'K', 1, true),
  ('DR Congo', 'dr-congo', 'COD', '🇨🇩', 'K', 2, true),
  ('Uzbekistan', 'uzbekistan', 'UZB', '🇺🇿', 'K', 3, true),
  ('Colombia', 'colombia', 'COL', '🇨🇴', 'K', 4, true),
  -- Group L
  ('England', 'england', 'ENG', '🏴', 'L', 1, true),
  ('Croatia', 'croatia', 'CRO', '🇭🇷', 'L', 2, true),
  ('Ghana', 'ghana', 'GHA', '🇬🇭', 'L', 3, true),
  ('Panama', 'panama', 'PAN', '🇵🇦', 'L', 4, true)
on conflict (slug) do nothing;
