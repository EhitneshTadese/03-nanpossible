# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WIAL Platform — a multi-tenant SaaS for the World Institute for Action Learning. Chapters get subdomain-based microsites (e.g., `usa.wial.org`), coaches have AI-powered search profiles, and certifications (CALC/PALC/SALC/MALC) are managed with RBAC.

## Commands

- `npm run dev` — dev server (custom wrapper in `scripts/dev-server.mjs`)
- `npm run build` — production build (custom wrapper in `scripts/reliable-build.mjs`, outputs to `.next.nosync`)
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript strict check (`tsc --noEmit`)
- `npm run test` — Vitest (all tests)
- `npx vitest run src/lib/foo.test.ts` — run a single test file
- `npm run seed:coaches` — seed sample coaches
- `npm run manage:roles` — CLI for role management

## Architecture

### Multi-Tenancy (Middleware → URL Rewrite)
`src/middleware.ts` extracts subdomain from hostname, looks up the chapter (with 60s cache), injects `x-wial-tenant`/`x-chapter-id`/etc. headers, and rewrites requests to `/sites/[tenant]/[path]` internally. Routes like `/login`, `/auth/*`, `/admin/*`, `/dashboard/*` bypass rewriting.

### Route Layout
- `src/app/(marketing)/` — public pages (coach directory, certification hub)
- `src/app/(tenant)/sites/[tenant]/` — chapter microsites (served via middleware rewrite)
- `src/app/admin/` — platform & chapter admin (global, chapter, approvals)
- `src/app/account/` — authenticated user area (profile, certifications, dues, registration flows)
- `src/app/api/` — API routes (search, chatbot, embed, audio, payments, content, chapters)

### Hybrid Coach Search (`src/lib/coach-search.ts`)
Combines four strategies: Cohere vector embeddings (pgvector), PostgreSQL full-text keyword search, LLM-powered query parsing (Claude Haiku via OpenRouter), and name fallback. Results cached in-memory (5-min TTL).

### RBAC (5-tier)
Roles: `platform_admin`, `chapter_admin`, `content_creator`, `coach`, `public_visitor`. Enforced at three layers: Supabase RLS policies, middleware (protected routes), and application logic (`src/lib/auth.ts`).

### Supabase Clients
- `createServiceRoleSupabaseClient()` — admin/server operations
- `createSupabaseContentClient()` — public/tenant-scoped reads
- `createServerSupabaseAuthClient()` — auth operations (cookies)
- `createBrowserSupabaseClient()` — client-side

### Database
PostgreSQL via Supabase with pgvector extension. Migrations in `supabase/migrations/`. Falls back to JSON fixtures in `src/content/` if DB is unavailable.

### Integrations
OpenRouter (LLM gateway), Cohere (embeddings), Stripe (payments), ElevenLabs (TTS), Credly (badges), Resend (email).

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- Node 22 (`.nvmrc`), strict TypeScript
- Tailwind CSS v4
- Tests co-located with source as `.test.ts` files in `src/lib/`
- Static content fixtures live in `src/content/` (JSON/TS)
