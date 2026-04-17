# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

Required environment variables (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL` (defaults to http://localhost:3000)

## Architecture

**Waveon** is a B2B SaaS app (in French) that helps merchants convert customers into Google reviews and Instagram followers via gamified campaigns (spinning wheel mechanic).

### Route Groups

```
app/
├─ (auth)/          - Login, register, password reset
├─ (dashboard)/     - Protected merchant area (dashboard, campaigns, clients, bookings, etc.)
├─ (public)/[slug]/ - Public campaign landing pages with spin wheel
└─ api/             - API routes (participations, wheel/spin, review/confirm)
```

Middleware (`middleware.ts`) enforces auth: unauthenticated users on dashboard routes are redirected to `/login?redirect=<path>`.

### Key Patterns

**Supabase clients** — three distinct clients in `lib/supabase/`:
- `client.ts` — browser (client components)
- `server.ts` — server components/actions (cookie-based)
- `admin.ts` — service role key for privileged API routes

**State management** — `WavonProvider` context (`components/wavon/`) wraps the dashboard and exposes business data (services, clients, reservations, settings) via `useWavon()` hook.

**Campaign flow** — merchant creates a campaign → share QR code/link → customer visits `/[slug]` → spins wheel (calls `POST /api/wheel/spin` → `spin_wheel()` Supabase RPC) → lands on Google review or Instagram follow URL.

**Database** — Supabase (PostgreSQL). Core tables: `users`, `campaigns`, `participations`, `rewards`, `wheel_items`. The `spin_wheel()` stored procedure handles atomic spin logic with probability weighting.

### Path Alias

`@/*` maps to the project root (e.g., `@/lib/supabase/client`).
