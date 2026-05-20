-- Cartes ligue privée V1 : catalogue, normalisation, pack de départ
-- Schéma déjà dans 20260519180000_pronoclash_init.sql (cards, card_inventory, card_plays)

-- ---------------------------------------------------------------------
-- 1) Catalogue V1 (5 cartes actives, autres désactivées)
-- ---------------------------------------------------------------------

insert into public.cards (id, name, description, effect_type, rarity, icon, is_active) values
  ('joker_x2',     'Joker x2',     'Double tes points sur ce match.',                                'self',   'common',    'spark',  true),
  ('vol_score',    'Vol de score', 'Copie le pronostic d''un autre joueur avant verrouillage.',     'target', 'rare',      'swap',   true),
  ('carton_rouge', 'Carton rouge', 'Empêche un joueur ciblé de modifier son prono.',                'target', 'epic',      'card',   true),
  ('tacle_glisse', 'Tacle glissé', 'Vole 2 points à un joueur si tu finis avec plus de points que lui sur ce match.', 'target', 'rare', 'tackle', true),
  ('var',          'VAR',          'Te permet de modifier ton prono jusqu''à 10 min avant le coup d''envoi.', 'self', 'legendary', 'eye', true),
  ('bus_gare',     'Bus garé',     'Bonus si tu pronostiques un match nul et que le résultat est bien nul.', 'self', 'common', 'shield', false),
  ('hold_up',      'Hold-up',      'Bonus si l''équipe choisie gagne avec exactement un but d''écart.', 'self', 'common', 'crown',  false),
  ('outsider',     'Outsider',     'Bonus si tu pronostiques correctement la victoire d''un outsider.', 'self', 'common', 'star',   false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  effect_type = excluded.effect_type,
  rarity = excluded.rarity,
  icon = excluded.icon,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 2) Statuts card_plays (ancien code utilisait "active")
-- ---------------------------------------------------------------------

update public.card_plays
set status = 'played'
where status = 'active';

-- ---------------------------------------------------------------------
-- 3) Pack de départ pour membres de ligues privées actives sans inventaire
-- ---------------------------------------------------------------------

insert into public.card_inventory (user_id, league_id, card_id, quantity)
select lm.user_id, lm.league_id, v.card_id, 1
from public.league_members lm
inner join public.leagues l on l.id = lm.league_id
cross join (
  values
    ('joker_x2'),
    ('vol_score'),
    ('carton_rouge'),
    ('tacle_glisse'),
    ('var')
) as v(card_id)
where l.kind is distinct from 'global'
  and l.status = 'active'
  and not exists (
    select 1
    from public.card_inventory ci
    where ci.user_id = lm.user_id
      and ci.league_id = lm.league_id
  )
on conflict (user_id, league_id, card_id) do nothing;

-- ---------------------------------------------------------------------
-- 4) VAR manquante (anciens packs sans var, inventaire déjà partiel)
-- ---------------------------------------------------------------------

insert into public.card_inventory (user_id, league_id, card_id, quantity)
select lm.user_id, lm.league_id, 'var', 1
from public.league_members lm
inner join public.leagues l on l.id = lm.league_id
where l.kind is distinct from 'global'
  and l.status = 'active'
  and exists (
    select 1 from public.card_inventory ci
    where ci.user_id = lm.user_id and ci.league_id = lm.league_id
  )
  and not exists (
    select 1 from public.card_inventory ci
    where ci.user_id = lm.user_id
      and ci.league_id = lm.league_id
      and ci.card_id = 'var'
  )
on conflict (user_id, league_id, card_id) do nothing;
