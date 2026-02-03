# Attune AI

Voice- and text-based AI support platform with specialized agents for different support domains. Attune AI provides structured, psychologically informed conversations—supportive and educational, not a replacement for licensed mental health professionals.

---

## How It Works

### High-level flow

1. **Landing** — Users visit the site; signed-in users go to the dashboard, others can sign up or log in.
2. **Choose an agent** — Each agent is a persona (e.g. addiction support, relationship communication, family dynamics, general reflection) with its own system prompt and RAG knowledge base.
3. **Start a session** — Sessions can be **text** (dashboard chat) or **voice** (Vapi). A session is tied to one agent and optionally to an authenticated user.
4. **Conversation** — User messages trigger:
   - **RAG retrieval**: the last few turns + current message are embedded and matched against `rag_doc_chunks` for that agent; retrieved chunks are injected into the LLM prompt.
   - **Structured response**: the model returns JSON with `message`, `resources`, and `suggestedAgents`. Crisis detection can augment the prompt with safety language (e.g. 988, professional help).
5. **Referrals (voice)** — During voice sessions, the agent can collect intake (symptoms, location, insurance) and call tools to look up providers (Zocdoc) and send an email summary (Resend).
6. **After the session** — Transcripts are stored; summaries can be generated. Referral clicks and suggestion engagement are tracked for analytics.

### Main concepts

| Concept | Description |
|--------|-------------|
| **Agents** | Configurations (system prompt, RAG namespace, intake questions)—not separate models. All use the same pipeline with different policy and context. |
| **Sessions** | One conversation with one agent. Can be text (dashboard) or voice (Vapi). Store transcript turns, optional summary, and runtime state (e.g. risk flags, active agent). |
| **RAG** | Documents are chunked, embedded (OpenAI), and stored in `rag_doc_chunks`. Each turn can retrieve relevant chunks per agent and log retrievals in `rag_retrievals`. |
| **Referrals** | Intake → provider lookup (Zocdoc) → top recommendations → optional email summary. Used from voice via Vapi tool calls. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| **Auth** | Supabase Auth (login, signup, RLS) |
| **Database** | Supabase (PostgreSQL), pgvector for embeddings |
| **Voice** | Vapi (calls, webhooks, server-side tools) |
| **LLM & embeddings** | OpenAI (chat + text-embedding-3-small) |
| **Referrals** | Zocdoc (provider search), Resend (email) |
| **RAG harvest** | Brave Search API, PDF/HTML extraction, existing ingest pipeline |

---

## Prerequisites

- **Node.js 18+** and npm
- **Supabase** project (Auth + Postgres + pgvector)
- **Vapi** account (voice sessions and webhooks)
- **OpenAI** API key (chat and embeddings)
- Optional: **Brave Search API** (for RAG harvest), **Zocdoc**, **Resend** (referrals/email)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and set values (see `.env.example` for full list):

```bash
cp .env.example .env.local
```

**Core (required for app + RAG):**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — Supabase project and anon key
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase (RLS bypass for ingest, etc.)
- `VAPI_API_KEY`, `VAPI_WEBHOOK_SECRET` — Vapi API and webhook verification
- `OPENAI_API_KEY` — Chat and embeddings

**Client-side voice (Vapi Web SDK):**

- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID`

**Referrals:** `ZOCDOC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`  
**RAG ingest:** `INGEST_SECRET` (protects POST `/api/rag/ingest`)  
**RAG harvest:** `BRAVE_API_KEY`, optional `HARVEST_*` (see [docs/rag-harvest.md](docs/rag-harvest.md))

### 3. Database

Run Supabase migrations in order (see `supabase/README_MIGRATIONS.md`):

```bash
supabase db push
```

Or run each file in the Supabase SQL Editor: `001_profiles.sql` through `009_session_resources.sql`. Migrations set up profiles, pgvector, `rag_doc_chunks` / `match_rag_chunks`, `rag_retrievals`, `suggestions`, session state and user link, RLS, and session resources.

### 4. Seed agent profiles (optional)

If `agent_profiles` is empty, the app falls back to seed data in code. To seed the DB:

```bash
# POST to your app (replace origin if needed)
curl -X POST http://localhost:3000/api/seed/agent-profiles
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in, then use the dashboard (text chat) or go to **Agents** to start a voice session.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Next.js lint |
| `npm run test` | Vitest |
| `npm run rag:harvest` | RAG harvester: Brave Search → fetch/extract → ingest. See [docs/rag-harvest.md](docs/rag-harvest.md). Example: `npm run rag:harvest -- --agent sleep_insomnia --limit 20` |

---

## Project structure

```
attune-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing (public)
│   │   ├── auth/               # Login, signup, update-password
│   │   ├── dashboard/          # Authenticated dashboard (chat, sessions, settings, voice)
│   │   ├── agents/             # Agent list + [agentId] (start voice session)
│   │   ├── referrals/          # Referral summary, confirmation
│   │   ├── api/                # API routes (see below)
│   │   └── globals.css, layout.tsx
│   ├── components/             # UI (Navbar, chat, session cards, voice widget, etc.)
│   ├── hooks/                  # e.g. useVapiVoice
│   ├── lib/                    # Core logic
│   │   ├── db.ts               # DB helpers
│   │   ├── agents.ts           # Agent profile types/seed
│   │   ├── vapi.ts, vapi-tools.ts, vapi-env.ts  # Vapi client and tools
│   │   ├── rag/                # RAG: chunking, embeddings, ingest, harvest
│   │   ├── recommendations/    # Agent routing, crisis detection, retrieve resources
│   │   ├── email/              # Resend + console provider
│   │   ├── zocdoc/             # Provider search
│   │   └── tools/              # findProviders, getRagResources handlers
│   └── utils/supabase/         # Supabase server/client/middleware
├── supabase/
│   ├── migrations/             # 001–009 (profiles, pgvector, RAG, sessions, RLS, etc.)
│   └── README_MIGRATIONS.md
├── scripts/
│   └── rag_harvest.ts          # CLI for RAG harvest
├── docs/                       # Implementation, RAG, referrals, Vapi, UI
├── AGENTS.md                   # Agent architecture and design
└── PRD.md                      # Product requirements
```

---

## API overview

**Sessions**

- `POST /api/sessions/start` — Create session (and optionally start Vapi call); body e.g. `{ "agentId": "addiction_support" }`.
- `GET /api/sessions/by-vapi-call/[callId]` — Resolve Vapi call ID to session.
- `POST /api/sessions/link-voice-call` — Link existing session to Vapi call.
- `POST /api/sessions/[sessionId]/chat` — Text chat (RAG + structured response).
- `GET /api/sessions/[sessionId]/timeline` — Transcript timeline.
- `POST /api/sessions/[sessionId]/summarize` — Generate session summary.
- `POST /api/sessions/[sessionId]/tool-results` — Submit tool results (e.g. from Vapi).

**Vapi**

- `POST /api/vapi/webhook` — Vapi webhook (transcript, call-ended, function calls).
- `GET /api/vapi/call-context` — Call context for Vapi (e.g. agent prompt, tools).

**RAG**

- `POST /api/rag/ingest` — Ingest document (auth: `INGEST_SECRET`); body includes `agentId`, `title`, `content`, optional `metadata`.
- `POST /api/rag/query` — Query RAG (embed + `match_rag_chunks`).

**Referrals / intake**

- `POST /api/intake` — Create/update intake.
- `POST /api/referrals/lookup` — Provider lookup (Zocdoc) and store referrals.
- `POST /api/referrals/email` — Send referral email summary.
- `GET /api/referrals/[referralId]/click` — Track referral link click.

**Tools (used by Vapi server-side)**

- `POST /api/tools/findProviders` — Provider search for the agent.
- `POST /api/tools/getRagResources` — RAG-backed resources for the agent.

**Other**

- `GET /api/recommendations` — Agent/resource recommendations.
- `POST /api/seed/agent-profiles` — Seed `agent_profiles` table.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [AGENTS.md](AGENTS.md) | Agent architecture, profile structure, shared capabilities |
| [PRD.md](PRD.md) | Product goals, features, data models |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | RAG pipeline, chat API contract, crisis detection, debugging |
| [docs/SCREENING_REFERRAL_WORKFLOW.md](docs/SCREENING_REFERRAL_WORKFLOW.md) | Intake → Zocdoc → email referral flow |
| [docs/rag-harvest.md](docs/rag-harvest.md) | RAG harvest CLI (Brave, fetch, extract, ingest) |
| [docs/VAPI_*.md](docs/) | Vapi webhook, tools, Web SDK, prompts |
| [supabase/README_MIGRATIONS.md](supabase/README_MIGRATIONS.md) | Migration order and options |

---

## License

Private project — all rights reserved.
