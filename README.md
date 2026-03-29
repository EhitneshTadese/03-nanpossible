# WIAL Platform

**A unified digital platform for the World Institute for Action Learning to manage coach certification, discovery, and chapter coordination.**

## Team "NaNpossible"
- Ryan Sam Varghese
- Pragyan Jyoti Borthakur
- Chirag Manjeshwar
- Sai Manaswi Seela

## Problem Statement

The World Institute for Action Learning (WIAL) is a global nonprofit that trains and certifies Action Learning Coaches. However, they lacked a unified digital platform. Each chapter operated independently with no shared coach directory, no modern certification lifecycle tooling, and no way for coaches and organizations to discover and connect with certified professionals. This fragmentation hindered growth and made it difficult for organizations seeking Action Learning expertise.

Our solution: a multi-tenant, AI-enhanced platform that unifies WIAL's operations globally while empowering each chapter to maintain its own branded presence.

## Key Features

- **Multi-Tenant Chapter Microsites** — Each WIAL chapter gets its own branded subdomain (e.g., `usa.wial.org`, `emea.wial.org`) powered by a single codebase
- **AI-Powered Coach Directory** — Hybrid search combining vector embeddings, keyword search, and LLM-powered query understanding to help organizations find the right certified coaches
- **Certification Lifecycle Management** — Full tracking of CALC, PALC, SALC, and MALC certification levels with documents, LMS links, and Credly badge integration
- **AI Certification Chatbot** — Site-wide assistant answering WIAL certification and coaching methodology questions using GPT-4o-mini
- **Coach Registration & Approval Workflow** — Coaches self-register, chapter/platform admins review and approve, embeddings auto-update for search
- **AI-Generated Audio Narration** — ElevenLabs TTS for content pages and coach introductions, enabling accessibility and engagement
- **Payment Integration** — Stripe-powered dues collection and certification enrollment with payment history and webhook handling
- **Role-Based Access Control** — Five-tier permission system (platform admin, chapter admin, content creator, coach, visitor) enforced at database and middleware layers
- **Rich Content Management** — Chapter admins author pages and events with a TipTap-based rich text editor
- **Accessibility First** — Built-in contrast and text scale preferences persisted to user preferences

## Tech Stack

**Frontend**
- Next.js 15 (App Router, React 19, TypeScript)
- Tailwind CSS v4
- TipTap (rich text editor)
- Recharts (data visualization)
- jsPDF (PDF generation)

**Backend**
- Next.js API Routes and Server Actions
- Next.js Middleware (for multi-tenant subdomain routing)

**Database**
- Supabase (PostgreSQL with Row-Level Security)
- pgvector extension (AI vector search)
- Dolt for migration version control

**Integrations**
- **OpenRouter** — LLM API gateway (chatbot: GPT-4o-mini; query parsing: Claude 3.5 Haiku)
- **Cohere** — Embedding generation for semantic coach search
- **Stripe** — Payment processing for dues and enrollment
- **ElevenLabs** — Text-to-speech for audio narration
- **Credly** — Badge metadata and display
- **Resend** — Transactional email for admin notifications

## Getting Started

### Requirements
- Node.js >= 20.9 (< 23)
- Supabase account (or local setup)

### Installation

```bash
git clone https://github.com/2026-ASU-WiCS-Opportunity-Hack/03-nanpossible.git
cd 03-nanpossible
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_DOMAIN=localhost:3000

# Required: Supabase
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Required: LLM & Search
OPENROUTER_API_KEY=<openrouter-api-key>


## Optional Services:

# AI Vector Search (coach directory)
COHERE_API_KEY=<cohere-api-key>

# Payments
STRIPE_SECRET_KEY=<stripe-secret-key>

# Audio Narration
ELEVENLABS_API_KEY=<elevenlabs-api-key>

# Email Notifications
RESEND_API_KEY=<resend-api-key>

# Optional: WIAL LMS (defaults to https://wialportal.org/)
NEXT_PUBLIC_WIAL_LMS_URL=https://wialportal.org/
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run Vitest test suite |
| `npm run seed:coaches` | Seed sample coach data |
| `npm run content:sync` | Sync content artifacts |
| `npm run backfill:credly` | Sync Credly badge metadata |
| `npm run backfill:page-audio` | Generate audio for content pages |
| `npm run manage:roles` | CLI for user role management |
| `npm run dolt:setup` | Initialize Dolt migration tracking |

## Project Structure

```
src/
  app/
    (marketing)/              # Public pages: coach directory, certification hub
    (tenant)/sites/[tenant]/  # Per-chapter microsites
    admin/                    # Admin dashboard (global & chapter scopes)
    account/                  # Authenticated user area
    api/                      # Backend API routes
  components/                 # Reusable React components
  lib/                        # Business logic & utilities
  middleware.ts               # Multi-tenant routing
  content/                    # Static fixtures & configuration
supabase/                     # Database migrations & seed data
scripts/                      # Dev & deployment scripts
```

## Architecture Highlights

### Multi-Tenancy
Chapters are identified by subdomain (via middleware rewrite to `/sites/[tenant]`). Chapter-specific data is enforced through Supabase Row-Level Security policies. A fallback mode uses local JSON fixtures if the database is unavailable.

### AI Search
Coaches are searchable by:
- **Vector similarity** (Cohere embeddings + pgvector)
- **Keyword search** (PostgreSQL full-text search)
- **LLM-powered queries** (Claude parses natural language intent via OpenRouter)

Results are cached in-memory to avoid rate limits.

### Certification Hub
Static data (certification levels, requirements, documents) lives in `src/content/`. Dynamic elements like Credly badges and LMS links are fetched and cached. Coaches see badges once their registration is approved and embeddings are regenerated.

### Security
- Row-Level Security enforced at the database level
- Five-tier role-based access control
- Middleware validates requests before routing
- Service role key kept server-side (never exposed to client)

## Live Demo


## DevPost Submission


---

## Submission Checklist

### 0/Judging Criteria
- [ ] Review the [judging criteria](https://www.ohack.dev/about/judges#judging-criteria) to understand how your project will be evaluated

### 1/DevPost
- [ ] Submit a [DevPost project to this DevPost page for our hackathon](https://wics-ohack-sp26-hackathon.devpost.com/) - see our [YouTube Walkthrough](https://youtu.be/rsAAd7LXMDE) or a more general one from DevPost [here](https://www.youtube.com/watch?v=vCa7QFFthfU)
- [ ] Your DevPost final submission demo video should be 4 minutes or less
- [ ] Link your team to your DevPost project on ohack.dev in [your team dashboard](https://www.ohack.dev/hack/2026_spring_wics_asu/manageteam)
- [ ] Link your GitHub repo to your DevPost project on the DevPost submission form under "Try it out" links

### 2/GitHub
- [ ] Add everyone on your team to your GitHub repo [YouTube Walkthrough](https://youtu.be/kHs0jOewVKI)
- [ ] Make sure your repo is public
- [ ] Make sure your repo has a MIT License
- [ ] Make sure your repo has a detailed README.md (see below for details)

---

*Built with passion by Team NaNpossible at the 2026 ASU WiCS Opportunity Hack.*
