-- =====================================================================
--  Prono Clash — Migration d'initialisation
--  Objectif : remplacer le schéma SaaS Waevon (réservations) par le
--             schéma jeu de pronostics Prono Clash.
--
--  Cette migration :
--    1. supprime proprement les anciennes tables wavon_* et structures
--       métier liées (réservations, services, clients, factures, etc.)
--    2. recrée un schéma propre dédié à Prono Clash
--    3. active RLS et définit les policies de base
--
--  ATTENTION : destructive. Pas de rollback automatique des données.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Nettoyage de l'ancien schéma Waevon
-- ---------------------------------------------------------------------

-- Drop des triggers/fonctions qui s'accrochent à auth.users
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_init on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.init_new_user() cascade;
drop function if exists public.wavon_init_new_user() cascade;

-- Tables Wavon (toutes en CASCADE pour éviter les dépendances)
drop table if exists public.wavon_email_delivery_logs cascade;
drop table if exists public.wavon_email_logs cascade;
drop table if exists public.wavon_email_templates cascade;
drop table if exists public.wavon_email_settings cascade;
drop table if exists public.wavon_invoice_items cascade;
drop table if exists public.wavon_invoices cascade;
drop table if exists public.wavon_invoice_settings cascade;
drop table if exists public.wavon_invoice_counters cascade;
drop table if exists public.wavon_blocked_slots cascade;
drop table if exists public.wavon_availability_segments cascade;
drop table if exists public.wavon_availability cascade;
drop table if exists public.wavon_reservations cascade;
drop table if exists public.wavon_clients cascade;
drop table if exists public.wavon_services cascade;
drop table if exists public.wavon_employees cascade;
drop table if exists public.wavon_businesses cascade;
drop table if exists public.wavon_profiles cascade;
drop table if exists public.dashboard_whatsapp_messages cascade;
drop table if exists public.dashboard_whatsapp_threads cascade;
drop table if exists public.wheel_pool cascade;
drop table if exists public.participations cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- ---------------------------------------------------------------------
-- 2) Utilitaires
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Trigger générique updated_at
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
-- 3) Profils utilisateurs (étend auth.users)
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  avatar_color text default 'indigo' not null,
  is_admin boolean default false not null,
  total_points integer default 0 not null,
  -- Consentements (RGPD, jamais mélangés)
  consent_terms_accepted_at timestamptz,
  consent_marketing_app boolean default false not null,
  consent_marketing_app_at timestamptz,
  consent_partner_offers boolean default false not null,
  consent_partner_offers_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index profiles_total_points_idx on public.profiles (total_points desc);
create index profiles_username_idx on public.profiles (username);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Trigger : à la création d'un user, créer son profil
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4) Tournoi : équipes, joueurs (buteurs), settings
-- ---------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  -- Nom générique (pas de logo officiel)
  name text not null unique,
  short_code text unique,
  color text,
  group_label text,
  is_outsider boolean default false not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.tg_set_updated_at();

create table public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  position text,
  goals_scored integer default 0 not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index players_team_id_idx on public.players (team_id);
create index players_goals_scored_idx on public.players (goals_scored desc);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.tg_set_updated_at();

-- Settings globaux (deadline concours, etc.)
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

insert into public.app_settings (key, value) values
  ('tournament_predictions_deadline', jsonb_build_object('deadline', null::text)),
  ('tournament_active', jsonb_build_object('active', true)),
  ('contest_prize_max_chf', jsonb_build_object('amount', 120));

-- ---------------------------------------------------------------------
-- 5) Prédictions finales (champion + meilleur buteur) & concours
-- ---------------------------------------------------------------------

create table public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  champion_team_id uuid references public.teams(id) on delete set null,
  top_scorer_id uuid references public.players(id) on delete set null,
  locked boolean default false not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  unique (user_id)
);

create trigger tournament_predictions_set_updated_at
  before update on public.tournament_predictions
  for each row execute function public.tg_set_updated_at();

-- Concours (le règlement légal autorise une participation gratuite)
create table public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  champion_team_id uuid references public.teams(id) on delete set null,
  top_scorer_id uuid references public.players(id) on delete set null,
  consent_terms_accepted boolean default false not null,
  consent_marketing_app boolean default false not null,
  consent_partner_offers boolean default false not null,
  ip_address inet,
  user_agent text,
  is_winner boolean default false not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create index contest_entries_user_id_idx on public.contest_entries (user_id);
create index contest_entries_email_idx on public.contest_entries (lower(email));

-- ---------------------------------------------------------------------
-- 6) Ligues (publique globale + privées payantes)
-- ---------------------------------------------------------------------

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- 'global' (publique gratuite, 1 seule), 'private', 'pro'
  kind text not null check (kind in ('global', 'private', 'pro')),
  owner_id uuid references auth.users(id) on delete set null,
  plan text check (plan in ('global', 'private', 'pro')),
  max_players integer default 20 not null,
  invite_code text unique,
  status text not null default 'active' check (status in ('pending_payment', 'active', 'archived')),
  paid_at timestamptz,
  stripe_session_id text,
  amount_chf numeric(10, 2),
  settings jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index leagues_owner_id_idx on public.leagues (owner_id);
create index leagues_kind_idx on public.leagues (kind);

create trigger leagues_set_updated_at
  before update on public.leagues
  for each row execute function public.tg_set_updated_at();

-- Une seule ligue globale, créée d'office
insert into public.leagues (slug, name, kind, plan, max_players, status, settings)
values (
  'global',
  'Ligue globale',
  'global',
  'global',
  1000000,
  'active',
  jsonb_build_object('cards_enabled', false, 'is_public', true)
);

-- Membres
create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  points integer default 0 not null,
  joined_at timestamptz default timezone('utc', now()) not null,
  primary key (league_id, user_id)
);

create index league_members_user_id_idx on public.league_members (user_id);
create index league_members_league_points_idx on public.league_members (league_id, points desc);

-- ---------------------------------------------------------------------
-- 7) Matchs
-- ---------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  kickoff_at timestamptz not null,
  stage text not null default 'group',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  home_score integer,
  away_score integer,
  winner text check (winner in ('home', 'away', 'draw')),
  locked_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  check (home_team_id <> away_team_id)
);

create index matches_kickoff_at_idx on public.matches (kickoff_at);
create index matches_status_idx on public.matches (status);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 8) Pronostics sur les matchs
-- ---------------------------------------------------------------------

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score integer not null check (predicted_home_score >= 0),
  predicted_away_score integer not null check (predicted_away_score >= 0),
  predicted_winner text check (predicted_winner in ('home', 'away', 'draw')),
  points integer default 0 not null,
  joker_x2 boolean default false not null,
  locked_at timestamptz,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  -- Un seul pronostic par user/match/league (league_id nullable pour global)
  unique (user_id, match_id, league_id)
);

create index predictions_match_id_idx on public.predictions (match_id);
create index predictions_user_id_idx on public.predictions (user_id);
create index predictions_league_id_idx on public.predictions (league_id);

create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.tg_set_updated_at();

-- Historique de scoring (audit + recalculs)
create table public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  league_id uuid references public.leagues(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  prediction_id uuid references public.predictions(id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz default timezone('utc', now()) not null
);

create index scoring_events_user_idx on public.scoring_events (user_id);
create index scoring_events_league_idx on public.scoring_events (league_id);

-- ---------------------------------------------------------------------
-- 9) Cartes (uniquement dans ligues privées)
-- ---------------------------------------------------------------------

create table public.cards (
  id text primary key,                      -- 'joker_x2', 'vol_score', etc.
  name text not null,
  description text not null,
  rarity text not null default 'common',
  icon text,
  enabled boolean default true not null
);

insert into public.cards (id, name, description, rarity, icon) values
  ('joker_x2',     'Joker x2',     'Double les points obtenus sur ce match.', 'epic',   'sparkles'),
  ('vol_score',    'Vol de score', 'Copie le pronostic d''un autre joueur ciblé avant verrouillage.', 'rare', 'swap'),
  ('carton_rouge', 'Carton rouge', 'Empêche un joueur ciblé de modifier son prono après activation.', 'rare', 'card'),
  ('tacle_glisse', 'Tacle glissé', 'Si tu fais plus de points que la cible sur ce match, tu lui voles 2 points.', 'rare', 'tackle'),
  ('var',          'VAR',          'Permet de modifier ton prono jusqu''à une limite spéciale (15 min après kickoff).', 'epic', 'video'),
  ('bus_gare',     'Bus garé',     'Bonus si tu pronostiques un match nul et que le résultat est nul.', 'common', 'bus'),
  ('hold_up',      'Hold-up',      'Bonus si l''équipe choisie gagne avec exactement un but d''écart.', 'rare', 'heist'),
  ('outsider',     'Outsider',     'Bonus si tu pronostiques correctement une victoire d''une équipe outsider.', 'epic', 'underdog');

-- Inventaire des cartes par joueur (par ligue)
create table public.card_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  card_id text not null references public.cards(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  unique (user_id, league_id, card_id)
);

create index card_inventory_user_league_idx on public.card_inventory (user_id, league_id);

create trigger card_inventory_set_updated_at
  before update on public.card_inventory
  for each row execute function public.tg_set_updated_at();

-- Cartes jouées
create table public.card_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  card_id text not null references public.cards(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  payload jsonb default '{}'::jsonb not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'consumed')),
  played_at timestamptz default timezone('utc', now()) not null,
  -- Max 1 carte jouée par user/match/league
  unique (user_id, match_id, league_id)
);

create index card_plays_league_match_idx on public.card_plays (league_id, match_id);
create index card_plays_target_idx on public.card_plays (target_user_id);

-- ---------------------------------------------------------------------
-- 10) Paiements (Stripe one-time pour créer une ligue privée)
-- ---------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  league_id uuid references public.leagues(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount_chf numeric(10, 2) not null,
  currency text not null default 'CHF',
  plan text not null check (plan in ('private', 'pro')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  raw jsonb,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create index payments_user_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 11) RLS — Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles               enable row level security;
alter table public.teams                  enable row level security;
alter table public.players                enable row level security;
alter table public.app_settings           enable row level security;
alter table public.tournament_predictions enable row level security;
alter table public.contest_entries        enable row level security;
alter table public.leagues                enable row level security;
alter table public.league_members         enable row level security;
alter table public.matches                enable row level security;
alter table public.predictions            enable row level security;
alter table public.scoring_events         enable row level security;
alter table public.cards                  enable row level security;
alter table public.card_inventory         enable row level security;
alter table public.card_plays             enable row level security;
alter table public.payments               enable row level security;

-- Helper : is_admin pour le user courant
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

-- Helper : user est-il membre d'une ligue ?
create or replace function public.is_league_member(p_league uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league and user_id = auth.uid()
  );
$$;

-- ----- profiles : chacun lit/écrit le sien ; lecture publique en lecture seule pour pseudo/points
create policy "profiles_read_self_or_public_fields"
  on public.profiles for select
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ----- teams / players / cards / app_settings : lecture publique, écriture admin
create policy "teams_read_all"          on public.teams          for select using (true);
create policy "teams_write_admin"       on public.teams          for all    using (public.is_admin()) with check (public.is_admin());

create policy "players_read_all"        on public.players        for select using (true);
create policy "players_write_admin"     on public.players        for all    using (public.is_admin()) with check (public.is_admin());

create policy "cards_read_all"          on public.cards          for select using (true);
create policy "cards_write_admin"       on public.cards          for all    using (public.is_admin()) with check (public.is_admin());

create policy "app_settings_read_all"   on public.app_settings   for select using (true);
create policy "app_settings_write_admin" on public.app_settings  for all    using (public.is_admin()) with check (public.is_admin());

-- ----- matches : lecture publique, écriture admin
create policy "matches_read_all"        on public.matches        for select using (true);
create policy "matches_write_admin"     on public.matches        for all    using (public.is_admin()) with check (public.is_admin());

-- ----- tournament_predictions : chacun voit ses prédictions (lecture admin pour stats)
create policy "tp_read_self_or_admin"
  on public.tournament_predictions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "tp_upsert_self"
  on public.tournament_predictions for insert
  with check (auth.uid() = user_id);

create policy "tp_update_self_unlocked"
  on public.tournament_predictions for update
  using (auth.uid() = user_id and locked = false)
  with check (auth.uid() = user_id);

-- ----- contest_entries : insertion publique (concours gratuit), lecture admin uniquement
create policy "contest_insert_anyone"
  on public.contest_entries for insert
  with check (true);

create policy "contest_read_admin"
  on public.contest_entries for select
  using (public.is_admin());

-- ----- leagues : lecture des ligues publiques + ligues où l'on est membre ; owner peut update
create policy "leagues_read_public_or_member"
  on public.leagues for select
  using (
    kind = 'global'
    or owner_id = auth.uid()
    or public.is_league_member(id)
    or public.is_admin()
  );

create policy "leagues_update_owner"
  on public.leagues for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- (création des ligues : passe par API serveur après paiement → service role bypass RLS)
-- pas de policy insert publique pour bloquer les triches

-- ----- league_members : un user voit sa propre ligne + les autres membres de ses ligues
create policy "lm_read_member_or_admin"
  on public.league_members for select
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id)
    or public.is_admin()
  );

-- Insertion uniquement via API serveur (service role) pour contrôler invite_code etc.
-- On laisse cependant une porte pour rejoindre la ligue globale soi-même :
create policy "lm_join_global_self"
  on public.league_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.leagues l
      where l.id = league_id and l.kind = 'global'
    )
  );

-- ----- predictions : chaque user gère les siennes, lecture autorisée aux membres de la ligue
create policy "predictions_read_self_or_league"
  on public.predictions for select
  using (
    user_id = auth.uid()
    or (league_id is not null and public.is_league_member(league_id))
    or public.is_admin()
  );

create policy "predictions_insert_self"
  on public.predictions for insert
  with check (user_id = auth.uid());

create policy "predictions_update_self_open"
  on public.predictions for update
  using (
    user_id = auth.uid()
    and (locked_at is null or locked_at > now())
  )
  with check (user_id = auth.uid());

create policy "predictions_delete_self_open"
  on public.predictions for delete
  using (
    user_id = auth.uid()
    and (locked_at is null or locked_at > now())
  );

-- ----- scoring_events : lecture admin + lecture du user concerné
create policy "scoring_read_self_or_admin"
  on public.scoring_events for select
  using (user_id = auth.uid() or public.is_admin());

-- ----- card_inventory : chaque user voit son inventaire + admin
create policy "ci_read_self_or_admin"
  on public.card_inventory for select
  using (user_id = auth.uid() or public.is_admin());

-- Pas de modification client : tout passe par API (service role)

-- ----- card_plays : visibles par les membres de la ligue + admin
create policy "cp_read_league_member_or_admin"
  on public.card_plays for select
  using (public.is_league_member(league_id) or public.is_admin());

-- ----- payments : lecture uniquement par le propriétaire et admin
create policy "payments_read_self_or_admin"
  on public.payments for select
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Fin de la migration init Prono Clash
-- =====================================================================
