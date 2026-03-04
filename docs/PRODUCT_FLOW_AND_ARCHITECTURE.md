# Attune AI – Product Flow, LLM Prompting & RAG Retrieval

This document describes the end-to-end flow of the product, how the LLM is prompted, and how RAG is used to retrieve agent-scoped resources (and how agents themselves are resolved).

---

## 1. Product Flow Overview

Attune AI has two main interaction paths: **voice** (Vapi) and **text chat**. Both use the same agent profiles and safety boundaries; only the text chat path currently uses RAG and structured LLM responses.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER ENTRY POINTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent directory → User picks agent → Start session (voice or chat)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        ┌───────────────────────┐               ┌───────────────────────┐
        │   VOICE (Vapi)        │               │   TEXT CHAT            │
        │   POST /api/sessions  │               │   POST /api/sessions/  │
        │   /start              │               │   [sessionId]/chat     │
        └───────────┬───────────┘               └───────────┬───────────┘
                    │                                       │
                    ▼                                       ▼
        • getAgentById(agentId)                  • getSessionDetail(sessionId)
        • createSession(agentId)                 • getAgentById(session.agent_id)
        • createCall(agent.system_prompt)       • Build retrieval query from
        • Return sessionId + vapi config          context (summary + last turns
          (agentPrompt = enhanced                 + current message)
          screening prompt)                      • getEmbedding(query)
                    │                            • match_rag_chunks(embedding,
                    ▼                              agent_id, top_k)
        Vapi uses prompt + functions             • buildSystemPrompt + buildUserPrompt
        for conversation; our webhook            • callChatStructured(system, user)
        receives transcript, function-call,       • Save turn, resources, suggested
        call-ended, end-of-call-report            agents; optional agent routing
```

### 1.1 Session start (shared)

1. Client sends `POST /api/sessions/start` with `{ agentId }`.
2. **Agent resolution**: `getAgentById(agentId)` loads the agent from the database (`agent_profiles`); if missing or DB fails, it falls back to the in-memory `SEED_AGENTS` list in `src/lib/agents.ts`.
3. A **session** is created in the DB (`sessions` table) linked to that `agent_id`.
4. For **voice**: `createCall()` is called with the agent’s `system_prompt`. That prompt is enhanced with the screening/referral workflow via `getScreeningAgentPrompt()` in `src/lib/vapi-tools.ts`. The returned Vapi config (including `agentPrompt` and `functions`) is sent to the client so it can start the call.
5. For **text chat**: the user already has a session; they send messages to `POST /api/sessions/[sessionId]/chat`. No separate “start” call for chat beyond having a session.

### 1.2 Voice flow (Vapi)

- **LLM and RAG**: The voice assistant runs on Vapi’s side. We send a single **system prompt** (agent’s `system_prompt` plus screening workflow). We do **not** run RAG or inject retrieved chunks in the voice path; Vapi uses that prompt and the configured tools (e.g. intake, specialist lookup, referral email).
- **Webhook** (`/api/vapi/webhook`): Receives:
  - `call-started`, `transcript`, `function-call`, `call-ended`, `end-of-call-report`
- We create or resolve a **session** by Vapi call ID (and optional user contact info). We persist transcript turns, handle tool calls (`createOrUpdateIntake`, `lookupSpecialists`, `sendReferralEmail`), and on `end-of-call-report` we replace transcript with the artifact and save Vapi’s summary.

### 1.3 Text chat flow (RAG + structured LLM)

1. **Request**: `POST /api/sessions/[sessionId]/chat` with `{ message }`.
2. **Session & agent**: Load session and transcript/summary; resolve agent via `session.agent` or `getAgentById(session.agent_id)`.
3. **Crisis check**: Optional crisis detection on the user message; risk flags stored in session state.
4. **Retrieval query**: `buildRetrievalQueryFromContext(context)` builds a string from session summary, summary JSON topics, last N turns, and current user message (see [How we prompt the LLM](#2-how-we-prompt-the-llm)).
5. **Agent for retrieval**: On the first message, we use **topic-based routing** (`routeAgents`) to optionally choose a better-fit agent for RAG (and adopt that agent for the session). On later messages we may still use a different agent for retrieval if router confidence is above a threshold; otherwise we use the session’s agent.
6. **RAG retrieval**: Query is embedded with OpenAI; `match_rag_chunks(query_embedding, filter_agent_id, match_count, match_threshold)` returns top‑K chunks for that agent. Chunks are passed into the prompt (see below).
7. **LLM call**: We build system and user prompts (including retrieved chunks and available agents), then call `callChatStructured()` to get a JSON response: `message`, `resources`, `suggested_agents`.
8. **Persistence**: We save the assistant turn, log RAG retrievals in `rag_retrievals`, and insert resource/agent suggestions into `suggestions`. Session state is updated (e.g. `active_agent`, risk flags).

---

## 2. How We Prompt the LLM

### 2.1 Where prompts come from

- **Agent system prompt**: Each agent has a `system_prompt` (and `rag_namespace` / `agent_id` for RAG). Stored in `agent_profiles` or in `SEED_AGENTS` in `src/lib/agents.ts`. All agents share a **BASE_SAFETY** line (no medical/clinical advice; encourage professional help in crisis).
- **Voice (Vapi)**: The prompt sent to Vapi is `getScreeningAgentPrompt(agent.system_prompt)` — i.e. the agent’s system prompt plus the screening/referral workflow and function-usage instructions from `src/lib/vapi-tools.ts`.
- **Text chat**: The prompt is built in `src/lib/rag/chat.ts`: `buildSystemPrompt()` and `buildUserPrompt()`.

### 2.2 Text chat: system prompt (`buildSystemPrompt`)

- **Base**: Agent’s `system_prompt` + a short disclaimer (supportive AI; no diagnosis; respond only with valid JSON).
- **Behavior**: Keep replies brief (1–4 sentences), address the user directly, use retrieved context only to support the reply.
- **Suggestions**: When `availableAgents` is provided, we add instructions to suggest 1–3 voice agents (from the list) and up to 2 resources when relevant; we tell the model the current agent id so it suggests *other* agents.
- **Crisis**: If `crisisDetected` and `crisisMessage` are set, we append the safety message and instruct the model to include it.
- **Structured output**: We append the **STRUCTURED_RESPONSE_SCHEMA** so the model returns only JSON:
  - `message`: string (brief conversational reply)
  - `resources`: 0–2 items with `id`, `title`, `snippet`, `url`, `type`, `reason`
  - `suggested_agents`: array of `agent_id`, `name`, `reason`, `confidence` (0–1)

### 2.3 Text chat: user prompt (`buildUserPrompt`)

- **Available voice agents**: List of agents (id, name, description, tags, recommendedFor) so the model can suggest others; we note the current agent so it doesn’t suggest the same one.
- **Retrieved context**: Section “Retrieved context” with each RAG chunk’s content (used briefly to support the reply).
- **Recent conversation**: Last turns in “User: / Assistant:” form, then the current user message.
- **Closing instruction**: Either a crisis instruction (include safety message, still JSON) or the normal instruction (reply briefly; when relevant include suggested_agent and resource; respond with valid JSON only).

### 2.4 LLM API call (text chat)

- **Function**: `callChatStructured(systemPrompt, userPrompt, model)` in `src/lib/rag/chat.ts`.
- **API**: OpenAI `POST /v1/chat/completions` with:
  - `messages`: `[{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]`
  - `response_format: { type: 'json_object' }`
  - `temperature: 0.7`
- **Model**: `process.env.OPENAI_CHAT_MODEL` or `gpt-4o-mini`.
- **Response**: Parsed as `ChatStructuredResponse` (`message`, `resources`, `suggested_agents`); missing arrays are defaulted.

---

## 3. How RAG Retrieves Agents and Resources

### 3.1 How “agents” are retrieved (no RAG)

- **Agents** are not retrieved by RAG. They are loaded from:
  - **Database**: `agent_profiles` table (via Supabase client in `getAgentById` / `getAgents` in `src/lib/agents.ts`).
  - **Fallback**: If the DB has no rows or the query fails, `SEED_AGENTS` is used.
- So “retrieving the agent” means: given an `agentId` (or session’s `agent_id`), we fetch that agent’s profile (name, description, system_prompt, rag_namespace, intake_questions, etc.) from DB or seed. The **rag_namespace** / **agent_id** is what scopes which RAG documents/chunks that agent can “see.”

### 3.2 How RAG resources are stored (ingest)

- **Table**: Documents live in `rag_docs`; chunk-level vectors live in `rag_doc_chunks` (see `supabase/migrations/003_rag_doc_chunks.sql`).
- **Ingest API**: `POST /api/rag/ingest` (protected by `INGEST_SECRET`) with `agentId`, `title`, `content`, optional `metadata`.
- **Pipeline** (`src/lib/rag/ingest.ts`):
  1. Insert row into `rag_docs` (agent_id, title, content, metadata).
  2. **Chunk** content with `splitIntoChunks()` in `src/lib/rag/chunk.ts`: ~200–800 token chunks (target 450, overlap 80), splitting on paragraph/newline/sentence when possible.
  3. **Embed** all chunk texts with OpenAI embeddings (`getEmbeddings()` in `src/lib/rag/embeddings.ts`); default model `text-embedding-3-small`, 1536 dimensions.
  4. Insert rows into `rag_doc_chunks`: `rag_doc_id`, `agent_id`, `chunk_index`, `content`, `embedding`, `metadata`.
- So each **agent** has its own set of documents and chunks; RAG retrieval is always filtered by `agent_id`.

### 3.3 How RAG retrieval works (query path)

- **Purpose**: Retrieve the most relevant chunks for the **current conversation context** so they can be injected into the LLM user prompt. Optionally, a **different** agent than the session agent is used for retrieval (topic routing).
- **Query building**: In the chat API we build a retrieval string from:
  - Session summary text
  - Summary JSON topics
  - Last 6 turns
  - Current user message  
  (see `buildRetrievalQueryFromContext` in `src/lib/rag/chat.ts`; length capped at 2000 chars.)
- **Embedding**: That string is embedded with `getEmbedding(query)` (OpenAI, same model/dimensions as ingest).
- **Vector search**: We call Supabase RPC `match_rag_chunks`:
  - **Parameters**: `query_embedding` (vector(1536)), `filter_agent_id`, `match_count` (e.g. 5), `match_threshold` (e.g. 0).
  - **Logic** (in `003_rag_doc_chunks.sql`): Filter `rag_doc_chunks` by `agent_id`, order by cosine distance (`embedding <=> query_embedding`), return top N rows with `similarity = 1 - distance`.
- **Result**: List of chunks (content, score, metadata, chunk_id, rag_doc_id) is passed to `buildUserPrompt()` as “Retrieved context.”
- **Who is used for retrieval**: In chat, we decide an `effectiveAgent` (session agent or a routed agent from `routeAgents()`). RAG uses `effectiveAgent.id` as `filter_agent_id`. So we retrieve **resources** (chunks) for that agent, not “agents” themselves.

### 3.4 Other uses of RAG

- **Standalone RAG query**: `POST /api/rag/query` with `agentId`, `query`, optional `topK` and `matchThreshold`. Same flow: embed query → `match_rag_chunks` → return chunk list. Used when you want raw retrieval without going through chat.
- **Post-call resources**: `getRagResources` (e.g. in `src/lib/tools/getRagResources/handler.ts`) uses the same `match_rag_chunks` RPC. It resolves an agent from request `agentId` or a topic mapping, builds a query from user message or last transcript or topic, embeds it, and returns a list of resource cards (title, type, url, snippet, why) for the user. So “resources” here are still RAG chunks (and metadata) scoped by agent.

### 3.5 Summary table

| What                | How it’s “retrieved” |
|---------------------|----------------------|
| **Agents**          | DB + seed: `getAgentById` / `getAgents`. Not RAG. |
| **Agent’s resources** | RAG: ingest → `rag_docs` + `rag_doc_chunks` (by agent_id). Query: embed context → `match_rag_chunks(query_embedding, agent_id, top_k)` → chunks injected into LLM prompt. |
| **Post-call resources** | Same `match_rag_chunks` by agent (or topic-mapped agent); query from transcript/topic/message. |

---

## 4. Key Files Reference

| Concern            | Files |
|--------------------|--------|
| Agent definitions & resolution | `src/lib/agents.ts` |
| Session start (voice) | `src/app/api/sessions/start/route.ts`, `src/lib/vapi.ts`, `src/lib/vapi-tools.ts` |
| Vapi webhook       | `src/app/api/vapi/webhook/route.ts` |
| Text chat + RAG    | `src/app/api/sessions/[sessionId]/chat/route.ts`, `src/lib/rag/chat.ts` |
| RAG ingest         | `src/app/api/rag/ingest/route.ts`, `src/lib/rag/ingest.ts`, `src/lib/rag/chunk.ts` |
| RAG embeddings     | `src/lib/rag/embeddings.ts` |
| RAG query API      | `src/app/api/rag/query/route.ts` |
| RAG DB (chunks + match) | `supabase/migrations/003_rag_doc_chunks.sql` |
| Post-call RAG resources | `src/lib/tools/getRagResources/handler.ts` |
