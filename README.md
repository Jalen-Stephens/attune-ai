# Attune AI

Voice- and text-based AI support platform with specialized agents for different support domains.

## Overview

Attune AI provides structured, psychologically informed conversations through specialized AI agents. Each agent is designed to support a specific domain (e.g., addiction support, relationship communication, family dynamics) using evidence-informed conversational frameworks, retrieval-augmented generation (RAG), and post-session summaries.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Voice:** Vapi (voice sessions + webhook ingestion)
- **Vector Search:** pgvector (scaffolded, to be enabled)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Vapi account (for voice sessions)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `VAPI_API_KEY` - Your Vapi API key
- `VAPI_WEBHOOK_SECRET` - Secret for verifying Vapi webhook signatures (optional for now)
- `NEXT_PUBLIC_APP_URL` - Your app URL (defaults to `http://localhost:3000`)

### 3. Database Setup

1. Create a new Supabase project or use an existing one
2. Run the schema migration:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually run the SQL file in Supabase SQL Editor
# Copy and paste contents of supabase/schema.sql
```

The schema includes:
- `agent_profiles` - Agent configurations
- `sessions` - Voice session records
- `transcript_turns` - Individual transcript entries
- `session_summaries` - Post-session summaries
- `rag_docs` - RAG knowledge documents (with placeholder for embeddings)
- `profiles` - User profiles (see `supabase/migrations/001_profiles.sql` and `supabase/README_MIGRATIONS.md`)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
attune-ai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── agents/             # Agent selection pages
│   │   ├── dashboard/          # Session dashboard
│   │   └── api/                # API route handlers
│   ├── lib/                    # Core library functions
│   │   ├── supabase/           # Supabase clients
│   │   ├── db.ts               # Database operations
│   │   ├── vapi.ts             # Vapi integration
│   │   ├── agents.ts           # Agent profiles
│   │   └── types.ts            # TypeScript types
│   └── components/             # Reusable UI components
├── supabase/
│   └── schema.sql              # Database schema
└── README.md
```

## Features

### Agent Selection
- Browse available AI agents
- View agent details and system prompts
- Start voice sessions with selected agents

### Voice Sessions
- Create sessions via `/api/sessions/start`
- Receive Vapi webhook events at `/api/vapi/webhook`
- Store transcripts in real-time
- Track session status (active/ended)

### Session Dashboard
- View all past sessions
- View session transcripts
- Generate and view session summaries

### RAG (Retrieval-Augmented Generation)
- Ingest documents via `/api/rag/ingest`
- Query documents via `/api/rag/query`
- Scaffolded for pgvector integration

## API Endpoints

### POST `/api/sessions/start`
Start a new voice session with an agent.

**Request:**
```json
{
  "agentId": "addiction_support"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "vapi": {
    "callId": "stub-uuid",
    "webhookUrl": "http://localhost:3000/api/vapi/webhook",
    "agentPrompt": "..."
  }
}
```

### POST `/api/vapi/webhook`
Receive Vapi webhook events (transcripts, call status, etc.).

**Note:** Webhook signature verification is stubbed (TODO).

### POST `/api/sessions/[sessionId]/summarize`
Generate a summary for a completed session.

**Response:**
```json
{
  "success": true
}
```

### POST `/api/rag/ingest`
Store a document in the RAG knowledge base.

**Request:**
```json
{
  "agentId": "addiction_support",
  "title": "Coping Strategies",
  "content": "Document content...",
  "metadata": { "source": "manual" }
}
```

### POST `/api/rag/query`
Query the RAG knowledge base (placeholder implementation).

**Request:**
```json
{
  "agentId": "addiction_support",
  "query": "How to manage cravings?",
  "topK": 5
}
```

## Webhook Testing

Test the Vapi webhook endpoint with a sample payload:

```bash
curl -X POST http://localhost:3000/api/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript",
    "call": {
      "id": "test-session-id"
    },
    "transcript": {
      "role": "user",
      "text": "Hello, I need help with cravings.",
      "timestamp": "2024-01-28T12:00:00Z"
    }
  }'
```

Test call-ended event:

```bash
curl -X POST http://localhost:3000/api/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call-ended",
    "call": {
      "id": "test-session-id"
    }
  }'
```

**Note:** Replace `test-session-id` with an actual session ID from your database, or create a session first via `/api/sessions/start`.

## Development Notes

### Current Limitations (TODOs)

- **Vapi Integration:** The Vapi SDK integration is stubbed. Real call creation needs to be implemented.
- **Webhook Signature Verification:** Vapi webhook signature verification is not yet implemented.
- **RAG Vector Search:** pgvector extension and embedding generation are not yet enabled. Current RAG queries return placeholder results.
- **LLM Summarization:** Session summaries are stubbed. Integration with OpenAI API (or other LLM) is needed.
- **Session-Vapi Mapping:** The webhook handler needs a proper mapping between Vapi call IDs and internal session IDs.

### Next Steps

1. Integrate actual Vapi SDK for call creation
2. Implement webhook signature verification
3. Enable pgvector extension in Supabase
4. Implement embedding generation for RAG documents
5. Integrate LLM API for session summarization
6. Add authentication (Supabase Auth) if needed
7. Add error boundaries and loading states
8. Add comprehensive error handling and validation

## License

Private project - All rights reserved.
