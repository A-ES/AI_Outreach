# Job Search Command Center

Phase 1 foundation: auth, applications, contacts, weekly goals, and dashboard — built with Next.js 14, Supabase, and Tailwind CSS.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — PostgreSQL, Auth (email/password), Row Level Security
- **Deploy target** — Vercel

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration in `supabase/migrations/001_initial_schema.sql`.
3. Under **Authentication → Providers**, enable Email and (for local dev) disable email confirmation if you want instant sign-up.

### 2. Environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add the same environment variables in **Project Settings → Environment Variables**.
4. Deploy.

## Architecture

- **API routes** (`src/app/api/*`) — validation and response shaping only
- **Data access** (`src/lib/db/*`) — all Supabase queries and business rules
- **LLM infrastructure** (`src/lib/llm/*`) — provider-agnostic client, validation layer, auto-logging
- **Prompt templates** (`prompts/*`) — versionable prompt files for AI features (Phases 3+)
- **Auth** — Supabase SSR with middleware session refresh

## Phase 2: AI infrastructure

Run migration `supabase/migrations/002_ai_call_logs.sql` after Phase 1.
Run migration `supabase/migrations/003_resume_match_results.sql` for resume match (Phase 3).
Run migration `supabase/migrations/004_resumes.sql` for resume storage and tailoring (Phase 4).

Environment variables (see `.env.local.example`):

- `LLM_PROVIDER` — `deepseek` (default), `gemini`, or `openai` when adapters exist
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `LLM_DEFAULT_MODEL`

All AI features must call `LLMClient.generate()` — never the adapter directly. Validation and logging are automatic.

Manual validation test (no API key required):

```bash
npm run test:llm
```

To add a new LLM provider: create one adapter file (see `adapters/gemini.adapter.sketch.ts`) and register it in `adapters/index.ts`.

## RLS verification

Row Level Security ensures users only access their own rows. To test explicitly:

1. Sign up as **User A** and create an application. Note its `id` from the network tab or Supabase table editor.
2. Sign up as **User B** in another browser/incognito window.
3. As User B, call `GET /api/applications/{user_a_application_id}` — expect **404**.
4. In Supabase SQL Editor (as postgres, bypassing RLS), confirm both users' rows exist — but each user only sees their own via the app.

Optional SQL check (run in Supabase SQL editor after creating two test users):

```sql
-- Replace with real user UUIDs from auth.users
SET request.jwt.claim.sub = 'USER_A_UUID';
SELECT count(*) FROM applications; -- only User A rows

SET request.jwt.claim.sub = 'USER_B_UUID';
SELECT count(*) FROM applications; -- only User B rows
```

## Features (Phase 1)

- Sign up, log in, log out with persistent sessions
- Applications CRUD + Kanban board (drag to change status)
- Contacts CRUD with optional application link
- Weekly goals with actual vs. target (auto-updated from applications)
- Dashboard with live counts from the database

## Project structure

```
src/
  app/              # Pages and API routes
  components/       # UI components
  lib/
    db/             # Data-access modules per table
    llm/            # Provider-agnostic LLM client, adapters, validation
    supabase/       # Supabase client helpers
    validation/     # Zod schemas for API input
prompts/            # AI prompt templates (Phases 3+)
supabase/
  migrations/       # SQL schema + RLS
scripts/
  test-llm-validation.ts  # Manual LLM validation retry test
```
# AI_Outreach
