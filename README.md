# Prospection CRM

Outil personnel de prospection commerciale pour Obillz.

## Stack

- Next.js (App Router)
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS v4

## Démarrage

```bash
npm install
npm run dev
```

Variables d'environnement (`.env.local`) — voir `.env.example` :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (requis pour l’import API / cron)
- `PROSPECT_IMPORT_API_KEY` (import machine-to-machine Obillz)

## Production

App déployée sur Vercel : **https://waveon-beige.vercel.app**  
(`www.waveon.com` pointe vers Squarespace et ne sert **pas** cette app.)

Import API :
```
POST https://waveon-beige.vercel.app/api/internal/prospects/import
Authorization: Bearer <PROSPECT_IMPORT_API_KEY>
```

## Migration CRM

Appliquer la migration :

```
supabase/migrations/20260720100000_crm_prospection.sql
```

via le dashboard Supabase SQL Editor ou `supabase db push`.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Connexion |
| `/dashboard` | Priorités du jour |
| `/prospects` | Liste + import CSV |
| `/prospects/[id]` | Fiche + actions + historique |
| `/today` | Actions du jour |
| `/clients` | Prospects au statut Client |
| `/stats` | Statistiques |
| `/settings` | Délais de relance |
