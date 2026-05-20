# Sécurité des migrations Supabase (Prono Clash)

## Règles obligatoires

1. **Jamais sur production** : `supabase db reset`, `DROP TABLE`, `TRUNCATE`, `DELETE FROM` sur tables métier.
2. **Migrations additives** : `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
3. **Seeds** : `INSERT ... ON CONFLICT DO NOTHING` (ou `DO UPDATE` limité au catalogue, ex. `cards`).
4. **Ne jamais** : `UPDATE profiles SET is_admin = false` en masse ; ne pas réécrire les matchs Sportmonks.
5. **Admin manuel uniquement** : `supabase/scripts/grant_pronoclash_admin.sql` (email cible explicite).

## Tables protégées

- `matches`, `teams`, `predictions`, `profiles`, `leagues`, `league_members`
- `payments`, `sync_logs`, `scoring_events`

## Cartes (ligues privées)

- Fichier : `20260522120000_cards_v1_data.sql`
- Uniquement : catalogue `cards`, normalisation `card_plays.status`, inserts `card_inventory`
- Aucune suppression de données métier

## Vérification après migration

Exécuter `supabase/scripts/verify_production_health.sql` dans le SQL Editor.

## Migration init historique

`20260519180000_pronoclash_init.sql` a été **désarmée** (suppression des `DROP TABLE` destructifs). Si elle a déjà été appliquée en production, Supabase ne la réexécutera pas ; seules les **nouvelles** migrations sont poussées.
