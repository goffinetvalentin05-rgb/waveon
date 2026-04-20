# Waevon

SaaS B2B (français) de prise de rendez-vous pour prestataires : services, calendrier, clients, disponibilités, page publique de réservation et emails transactionnels (Resend).

## Prérequis

- Node.js 20+
- Un projet Supabase (auth + database + storage)

## Configuration

Copier `.env.example` vers `.env.local` et renseigner les variables (voir fichier pour la liste complète : Supabase, `NEXT_PUBLIC_BASE_URL`, Resend, `CRON_SECRET`, etc.).

Appliquer les migrations SQL du dossier `supabase/migrations/` sur ton projet Supabase.

Configurer le stockage pour les images de branding (bucket utilisé par l’app, voir `lib/wavon/storage.ts`).

## Démarrage

```
npm install
npm run dev
```

## Pages principales

- `/` — landing marketing
- `/login`, `/signup` — authentification
- `/dashboard` — espace commerçant
- `/reserver/[slug]` — page publique de réservation (`slug` = identifiant public du commerce)
