# CLAUDE.md

## Commands

```bash
npm run dev
npm run build
npm run lint
```

## Architecture

**Prospection CRM** — outil personnel pour gérer la prospection commerciale (clubs / prospects Obillz).

### Routes

```
app/
├─ (auth)/     - login, signup, update-password
├─ (app)/      - dashboard, prospects, today, clients, stats, settings
└─ api/        - prospects, tasks, settings, stats
```

Middleware protège les routes app et redirige vers `/login`.

### Données

Tables : `prospects`, `prospect_activities`, `daily_tasks`, `crm_settings` (RLS par `user_id`).

### Path Alias

`@/*` → racine du projet.
