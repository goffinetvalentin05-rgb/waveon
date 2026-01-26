# Waveon (MVP)

MVP SaaS B2B pour convertir les clients en avis Google et abonnés Instagram.

## Prérequis

- Node.js 20+
- Un projet Supabase (auth + database + storage)

## Configuration

Créer un fichier `.env.local` à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Variables requises : `NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Après modification de `.env.local`,
redémarrer le serveur Next.js.

Dans Supabase SQL Editor, exécuter `supabase/schema.sql`.

Créer un bucket public `logos` dans Supabase Storage.

## Démarrage

```
npm install
npm run dev
```

## Pages

- `/` page marketing
- `/login` auth (inscription / connexion)
- `/dashboard` dashboard commerçant
- `/:slug` page publique de campagne

## MVP

- Auth Supabase
- Création de campagnes + QR code
- Page publique avec jeu simple
- Stats basiques (visites, participations, avis, gains)
