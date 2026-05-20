-- Optionnel : corriger les anciens packs (2× joker_x2 → 1×)
-- À lancer manuellement en SQL Editor si des comptes de test ont l'ancien pack.
-- Ne modifie pas les inventaires où une carte a déjà été jouée (card_plays).

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
