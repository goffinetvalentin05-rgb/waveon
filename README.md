# Prono Clash

Application web mobile-first de pronostics entre amis pour le tournoi mondial de football 2026.
Pronostiquer les matchs, grimper dans la ligue générale, jouer des cartes en ligue privée
et saboter ses potes.

> **Pas une app de paris.** Aucune mise d'argent entre joueurs. Le paiement sert uniquement à
> créer une ligue privée et à débloquer le mode jeu avec cartes.

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4**
- **Supabase** : auth + Postgres (avec RLS), service role pour les routes serveur
- **Stripe** : paiement one-time pour la création de ligue privée
- **Resend** : emails transactionnels (welcome, ligue créée…)

## Démarrage

```bash
npm install
cp .env.example .env.local   # remplir les valeurs
npm run dev                  # http://localhost:3000
```

Variables d'environnement requises (cf. `.env.example`) :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `NEXT_PUBLIC_BASE_URL` | URL publique de l'app |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_LEAGUE_PRIVATE`, `STRIPE_PRICE_ID_LEAGUE_PRO` | Paiement Stripe (one-time) |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | Emails |
| `CRON_SECRET` | Cron interne (optionnel) |

## Base de données

Toutes les migrations sont dans `supabase/migrations/`. La migration initiale
`20260519180000_pronoclash_init.sql` :

1. supprime entièrement l'ancien schéma SaaS Waevon (réservations, services, etc.) ;
2. crée le schéma Prono Clash : `profiles`, `groups`, `teams`, `matches`, `leagues`,
   `league_members`, `predictions`, `cards`, `card_inventory`, `card_plays`,
   `scoring_events`, `payments`, `contest_settings`, `contest_results`, `app_settings` ;
3. active RLS et installe les policies (lecture publique des équipes/cartes/classement,
   écriture des prédictions/cartes restreintes au propriétaire, admin pour la gestion).

Pour donner l'accès admin à un user existant, mettre `is_admin = true` sur la ligne
`profiles` correspondante.

## Identité de marque

Le nom de l'app est centralisé dans `lib/brand/config.ts`. Pour rebrander, modifier ce seul
fichier (puis ajuster `EMAIL_FROM_NAME` côté env si nécessaire).

## Routes principales

| Route | Rôle |
|---|---|
| `/` | Landing page |
| `/login`, `/signup` | Auth |
| `/onboarding` | Pseudo, avatar, consentements (ligue générale automatique) |
| `/dashboard` | Vue d'ensemble joueur |
| `/matches` | Liste des matchs + saisie pronostics |
| `/global`, `/global/leaderboard` | Ligue générale + classement public |
| `/leagues/join` | Rejoindre une ligue par code d'invitation |
| `/leagues/new` | Création d'une ligue privée (Stripe Checkout) |
| `/leagues/[slug]` | Vue d'une ligue (membres, classement) |
| `/leagues/[slug]/invite` | Lien d'invitation + bouton WhatsApp |
| `/leagues/[slug]/cards` | Jouer ses cartes dans une ligue privée |
| `/leagues/join/[code]` | Rejoindre une ligue via code |
| `/admin/tournament/*` | Équipes, matchs (import CSV), scores |
| `/admin/contest` | Paramètres concours, recalcul classement, gagnant manuel |
| `/legal/*` | Conditions, confidentialité, règlement concours |

## Mécanique de jeu (MVP)

**Pronostics classiques**

- Bon vainqueur ou bon nul : +3
- Score exact : +5
- Bon écart de buts en plus du bon vainqueur : +1 bonus
- Verrouillage au coup d'envoi

**Cartes (ligues privées uniquement)**

- Chaque joueur reçoit 5 cartes à l'entrée dans une ligue privée
- Maximum 1 carte jouée par joueur par match
- Cartes MVP : `joker_x2`, `vol_score`, `carton_rouge`, `tacle_glisse`, `var`,
  `bus_gare`, `hold_up`, `outsider`

Les effets sont appliqués côté serveur dans `lib/pronoclash/match-finalize.ts`
au moment où l'admin entre le score final du match.

## Limitations / hors MVP

- emails : seuls les emails « welcome » et « ligue créée » sont implémentés ;
  les rappels et résumés post-match sont prévus mais pas branchés
- résumés fun après match : structure prête, à brancher dans une seconde phase
- badges et visuels partageables : prévus, hors MVP
