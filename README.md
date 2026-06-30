# Job Search Command Center

A full-stack job application tracker with five LLM-powered features, built as a personal tool for my own job search and as a portfolio project demonstrating full-stack and AI systems engineering.

## Why this exists

Most job-search tools either do nothing more than a spreadsheet, or market themselves as "AI-powered" without any real engineering behind that label. This project tries to do the opposite: a genuinely useful tracker, with a small number of LLM features built carefully enough to explain and defend — structured outputs, validation, logging, and evaluation, not just an API call wrapped in a button.

## What it does

- Tracks job applications through a Kanban-style pipeline (saved → applied → interviewing → offer/rejected/ghosted)
- Manages contacts (recruiters, HR, hiring managers) tied to applications
- Drafts personalized outreach emails for review and approval before sending — nothing sends automatically
- Tailors a resume per job application, with a guardrail that flags any content not present in the original
- Scores how well a resume matches a job description, with a reasoning trace and confidence label
- Checks whether a resume's file structure will parse cleanly through an Applicant Tracking System
- Surfaces evidence-backed insights from your own outreach history once there's enough data to say anything meaningful

## AI features

This project deliberately avoids the word "agent." None of these features plan, select tools, or act autonomously — they're structured LLM calls with retrieval and validation, and every output that could affect a real person passes through a human review step first.

| Feature | What it does | Model behavior |
|---|---|---|
| **Resume Match** | Scores a resume against a job description; returns matched/missing keywords and a requirement-by-requirement reasoning trace | Structured JSON output, confidence label with a stated reason |
| **Resume Tailoring** | Generates a job-specific resume variant from your base resume | Constrained to only use facts present in the base resume; a second, separate model call checks the output for fabricated claims before you can approve it |
| **Outreach Drafting** | Drafts a personalized cold email for a contact, using relevant resume content | Lands in a review queue — editable, approvable, or rejectable; sending is a separate, explicit action |
| **ATS Parseability Check** | Checks a resume's file structure for issues that break ATS parsing (multi-column layouts, missing text layers, tables, unrecognizable headers) | Mostly deterministic PDF-structure checks; only the header-recognizability check uses a model call |
| **Outcome Analytics** | Surfaces patterns across your sent emails and outcomes (e.g. which resume version gets more replies) | Computes real statistics in code first; only generates a model hypothesis once a minimum data threshold is met, and always shows the sample size alongside any claim |

## Architecture

```
Frontend (Next.js)
        ↓
API Layer (thin — request/response only)
        ↓
LLM Service Layer
    ├── ResumeMatchService
    ├── ResumeTailorService
    ├── OutreachDraftService
    ├── AtsCheckService
    └── AnalyticsService
        ↓
Provider-Agnostic LLM Client (DeepSeekAdapter — swappable for other providers without touching the services above)
        ↓
Validation Layer (every AI output is checked before it reaches the database; retries once on failure, then surfaces for manual review)
        ↓
AI Call Logger (wraps every LLM call — prompt, model, tokens, latency, confidence, validation result)
        ↓
PostgreSQL (Supabase)
```

Each service has exactly one public method (`.analyze()`, `.tailor()`, `.generate()`, `.check()`, `.generateInsights()`), which keeps the codebase easy to test and reason about.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **LLM Provider:** DeepSeek (`deepseek-v4-flash` / `deepseek-v4-pro`), via a provider-agnostic adapter layer
- **Email:** Resend API
- **Charts:** Recharts
- **Deployment:** Vercel

## Design decisions worth calling out

A few things in this project were left out on purpose, not by oversight:

- **No autonomous sending.** Every outreach email and every tailored resume requires explicit human approval before it's considered final. Cold-emailing real recruiters carries real-world cost if something goes wrong — a wrong company name, an oversharp claim, a bad merge — and that risk isn't worth the convenience of automation here.
- **No inbox reading or reply auto-classification.** Reading and judging someone else's email replies raises data-handling questions this project isn't built to answer responsibly.
- **No scraping.** Contacts are imported from the user's own research (e.g. a CSV of people they've personally identified and verified), never from purchased or scraped third-party lists. There's no bulk-send action anywhere in the app, regardless of how many contacts exist — sending stays per-contact, through the review queue.
- **Hallucination guardrails are load-bearing, not cosmetic.** DeepSeek's V4 models have a documented tendency to answer confidently even when uncertain. The resume tailoring feature's fabrication check and the confidence labeling on resume match exist specifically to counteract that, and they're tested, not just present.
- **The model is swappable.** All LLM calls go through a provider-agnostic client interface. Switching from DeepSeek to another provider means writing one new adapter file, not touching the four services that use it.

## Evaluation and testing

Two distinct concerns, kept separate:

- **Evaluation** (is the model's output good?) — a hand-built set of 25 job descriptions with manually-determined expected outputs, run against the Resume Match service to track keyword precision/recall and score accuracy over time. Visible on an in-app "AI Evaluation" page alongside average generation cost, latency, and confidence.
- **Testing** (is the code correct?) — unit tests for every service using mocked LLM responses, dedicated tests for the validation layer's retry/failure behavior, and integration tests covering the full path from API route to database write.

## Getting started

```bash
git clone https://github.com/<your-username>/job-search-command-center.git
cd job-search-command-center
npm install
cp .env.example .env.local
```

Fill in `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPSEEK_API_KEY=
RESEND_API_KEY=
LLM_PROVIDER=deepseek
```

Run database migrations against your Supabase project, then:

```bash
npm run dev
```

Run the test suite:

```bash
npm run test
```

## Project status

This is an active personal project, built and used for my own job search. Feedback and issues welcome.

## License

MIT
