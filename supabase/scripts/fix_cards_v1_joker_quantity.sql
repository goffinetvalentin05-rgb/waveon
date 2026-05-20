-- OPTIONNEL — à lancer manuellement dans le SQL Editor si besoin
-- Ne pas inclure dans db push automatique.
-- Corrige joker_x2 quantity 2 → 1 uniquement si la carte n'a jamais été jouée.
-- N'affecte pas matches, profiles.is_admin, payments, leagues.

update public.card_inventory ci
set quantity = 1,
    updated_at = timezone('utc', now())
where ci.card_id = 'joker_x2'
  and ci.quantity > 1
  and not exists (
    select 1
    from public.card_plays cp
    where cp.user_id = ci.user_id
      and cp.league_id = ci.league_id
      and cp.card_id = 'joker_x2'
  );
