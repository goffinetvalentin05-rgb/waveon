# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

Required environment variables (`.env.local`) — voir `.env.example` :
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` (et optionnellement `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO_FALLBACK`)
- `CRON_SECRET` (pour `POST /api/cron/emails`)

## Architecture

**Waevon** is a B2B SaaS app (in French) for appointment booking and merchant operations (services, clients, calendar, transactional emails).

### Route Groups

```
app/
├─ (auth)/           - Login, register, password reset
├─ (dashboard)/      - Espace commerçant (vue d’ensemble, calendrier, services, clients, disponibilités, paramètres)
├─ reserver/[slug]/  - Page publique de réservation (slug = `public_slug` du business)
└─ api/              - Réservations, emails, cron emails, annulation publique, etc.
```

Middleware (`middleware.ts`) enforces auth: unauthenticated users on dashboard routes are redirected to `/login?redirect=<path>`.

### Key Patterns

**Supabase clients** — three distinct clients in `lib/supabase/`:
- `client.ts` — browser (client components)
- `server.ts` — server components/actions (anon, sans session cookie dans ce projet)
- `admin.ts` — service role key for privileged API routes (emails, cron)
- `route-handler.ts` — route handlers avec session (`createRouteHandlerSupabase`)

**State management** — `WavonProvider` context (`components/wavon/`) wraps the dashboard and exposes business data (services, clients, reservations, settings) via `useWavon()` hook.

**Booking flow** — le commerçant configure services et disponibilités → partage `/reserver/[slug]` → le client choisit un créneau → insertion `wavon_reservations` (+ emails transactionnels via Resend).

**Database** — Supabase (PostgreSQL). Préfixe de tables métier : `wavon_*` (businesses, settings, services, clients, reservations, availability, email templates, email settings, email logs, etc.).

### Path Alias

`@/*` maps to the project root (e.g., `@/lib/supabase/client`).
