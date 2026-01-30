# RAG-Powered Conversational AI — Implementation Guide

## 1. Overview of the RAG Architecture

The system provides:

1. **Retrieval-Augmented chat** — User messages trigger a retrieval query (session summary + last N turns + current message). That query is embedded and matched against `rag_doc_chunks` (filtered by `agent_id`). Retrieved chunks are injected into the LLM prompt. The model responds with a **structured JSON**: `message`, `resources`, `suggested_agents`.

2. **Agent routing and suggestions** — The LLM can suggest other agents; a separate keyword-based router (`lib/recommendations/agentRouter.ts`) scores agents by query overlap and returns `agent_id`, `reason`, `confidence`. Session state stores `active_agent` and `last_router_confidence`.

3. **Resource suggestions** — Worksheets, exercises, articles are either: (a) returned from RAG (chunks with metadata like `resource_type`, `title`, `url`) and surfaced in the structured response, or (b) from the static `lib/resources.ts` catalog. The chat API returns `resources` as cards for the UI.

4. **Observability** — Every assistant turn that used RAG has a row in `rag_retrievals` (query, `retrieved_chunks` with scores). `suggestions` stores each resource/agent suggestion per turn and tracks `shown` / `clicked`.

5. **Safety** — Crisis detection runs on the user message before the LLM call. If triggered, the system prompt is augmented with a safety message (988, professional help) and `session.state.risk_flags` is updated. Non-clinical disclaimers are in the base system prompt.

---

## 2. New Tables and Why They Exist

| Table | Purpose |
|-------|--------|
| **rag_doc_chunks** | Chunk-level embeddings (200–800 tokens). Enables semantic search; raw docs stay in `rag_docs`. |
| **rag_retrievals** | One row per RAG-backed assistant turn: `session_id`, `assistant_turn_id`, `query`, `retrieved_chunks` (JSONB with chunk_id, score, content_preview). Debugging and auditing. |
| **suggestions** | UI suggestions: `session_id`, `turn_id`, `kind` ('resource' \| 'agent'), `payload` (JSONB), `shown`, `clicked`. Analytics and A/B. |
| **sessions.state** (JSONB) | Runtime state: `current_topic`, `risk_flags`, `active_agent`, `last_router_confidence`. Used by routing and safety. |
| **sessions.user_id** (optional) | FK to `auth.users(id)`. Links session to authenticated user. |

---

## 3. Migration Order

Run in Supabase SQL Editor (or `supabase db push`) in this order. **If you already ran 003 with 3072 dimensions:** drop the table first (`DROP TABLE IF EXISTS rag_doc_chunks CASCADE;`) then re-run 003; re-ingest documents after (they will be embedded with 1536 dimensions).

1. **002_pgvector.sql** — `CREATE EXTENSION IF NOT EXISTS vector;`
2. **003_rag_doc_chunks.sql** — Table `rag_doc_chunks`, indexes, and RPC `match_rag_chunks`.
3. **004_rag_retrievals.sql** — Table `rag_retrievals` and indexes.
4. **005_suggestions.sql** — Table `suggestions` and indexes.
5. **006_sessions_state_and_user.sql** — `sessions.state` (JSONB), `sessions.user_id` (FK to auth.users), indexes.

Existing migrations (e.g. `001_profiles.sql`) and the base schema (agent_profiles, sessions, transcript_turns, rag_docs, session_summaries, events) must already be applied.

---

## 4. Manual Supabase Steps

1. **Enable pgvector**  
   In Dashboard: Project Settings → Database → Extensions → enable `vector`. Or run `002_pgvector.sql`.

2. **Embedding dimension**  
   Default is **3072** (OpenAI `text-embedding-3-large`). If you use a different model (e.g. `text-embedding-3-small` → 1536), either:
   - Run a migration that uses `vector(1536)` for `rag_doc_chunks` and updates `match_rag_chunks` to `vector(1536)`, or
   - Set `OPENAI_EMBEDDING_DIMENSIONS=1536` and ensure the DB schema matches (table and function must use the same dimension).

3. **Vector index**  
   pgvector indexes (HNSW and IVFFlat) support **max 2000 dimensions**. The migration uses **1536** (OpenAI `text-embedding-3-small`) so HNSW indexing works. If you need 3072 (text-embedding-3-large), you must omit the vector index and use sequential scan, or use a different vector store.

4. **RPC**  
   After applying `003_rag_doc_chunks.sql`, the function `match_rag_chunks(query_embedding, filter_agent_id, match_count, match_threshold)` is available. The API calls it via `supabase.rpc('match_rag_chunks', { ... })`.

---

## 5. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for RAG/chat) | OpenAI API key for embeddings and chat. |
| `OPENAI_CHAT_MODEL` | No | Default `gpt-4o-mini`. Use e.g. `gpt-4o` for higher quality. |
| `OPENAI_EMBEDDING_MODEL` | No | Default `text-embedding-3-large`. |
| `OPENAI_EMBEDDING_DIMENSIONS` | No | Default `1536`. Must match DB `vector(N)` and embedding model. pgvector indexes support max 2000 dimensions. |
| Supabase / Vapi / etc. | — | As in `.env.example`. |

---

## 6. Known Pitfalls

- **Dimension mismatch** — Default is 1536 (text-embedding-3-small) so pgvector indexes work. If you change embedding model, update both `OPENAI_EMBEDDING_DIMENSIONS` (or model) and the DB: `rag_doc_chunks.embedding` and `match_rag_chunks(query_embedding vector(N))` must use the same N. Indexes support max 2000 dimensions.
- **Empty retrieval** — If `rag_doc_chunks` has no rows for an `agent_id`, RAG returns no chunks; the LLM still replies but without retrieved context. Ingest docs per agent via `/api/rag/ingest`.
- **Crisis path** — Crisis detection is keyword/regex. It can miss paraphrases; consider adding an optional classifier or human review for high-risk flows.
- **Structured JSON** — The model is instructed to return only JSON. Occasionally it may add markdown; the parser uses `JSON.parse`. Consider a small cleanup (strip code fences) if you see parse errors.
- **Session state** — `sessions.state` is updated on every chat message. If you run multiple workers, last-write-wins; for strict consistency you could use DB-level JSONB update with conditions.

---

## 7. How to Debug Bad RAG Responses

1. **Check retrieval**  
   Query `rag_retrievals` for the `session_id` and `assistant_turn_id` of the bad turn. Inspect `query` and `retrieved_chunks` (scores and content_preview). If scores are low or chunks irrelevant, improve chunking or ingest better content.

2. **Check chunks**  
   Run vector search manually (e.g. in SQL):
   ```sql
   SELECT id, content, metadata, 1 - (embedding <=> $query_embedding::vector) AS sim
   FROM rag_doc_chunks
   WHERE agent_id = 'your_agent_id'
   ORDER BY embedding <=> $query_embedding::vector
   LIMIT 5;
   ```
   Use a small script that calls `getEmbedding(your_query)` and passes the result as `$query_embedding`.

3. **Check prompt**  
   Log (in dev) the `systemPrompt` and `userPrompt` passed to `callChatStructured`. Ensure retrieved chunks appear in the user prompt and that the system prompt includes disclaimers and (if crisis) the safety message.

4. **Check agent and model**  
   Confirm `agent_profiles.system_prompt` and `OPENAI_CHAT_MODEL`. Weaker models may ignore instructions or produce malformed JSON.

---

## 8. How to Add New Agents or Resources

**New agent**

1. Add a row to `agent_profiles` (id, name, description, system_prompt, rag_namespace, intake_questions, etc.). You can do this via Supabase Dashboard or a seed script. The app also falls back to `lib/agents.ts` seed data if the DB has no rows.
2. Ingest documents for that agent: `POST /api/rag/ingest` with `agentId` set to the new agent’s `id`. Chunks will be stored in `rag_doc_chunks` with that `agent_id`.
3. Sessions created with this `agent_id` will use the new agent’s system prompt and RAG namespace when chatting.

**New resources (RAG-backed)**

1. Add or update a document (e.g. markdown) that describes the resource (title, snippet, type, url).
2. Ingest it via `POST /api/rag/ingest` with the appropriate `agentId` and `metadata` (e.g. `resource_type: 'exercise'`, `title`, `url`). Chunks will inherit metadata; the LLM can suggest them and the API returns them in `resources`.

**Static resources**

- Add entries to `lib/resources.ts` (RESOURCES array). The existing `retrieveResources()` (keyword-based) and any UI that calls it will surface these. You can also merge RAG-suggested resources with static ones in the chat response.

---

## 9. Frontend Contract

### Chat API

- **Endpoint:** `POST /api/sessions/[sessionId]/chat`
- **Body:** `{ "message": "user text" }`
- **Response:** JSON matching `ChatApiResponse`:

```ts
interface ChatApiResponse {
  turnId: string;           // UUID of the assistant transcript_turn
  message: string;           // Assistant reply text
  resources: ResourceCard[];
  suggestedAgents: AgentCard[];
  retrievalLogged: boolean;
}

interface ResourceCard {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  type: string;   // e.g. 'exercise' | 'article' | 'guide' | 'handout'
  reason: string;
}

interface AgentCard {
  agent_id: string;
  name: string;
  reason: string;
  confidence: number;  // 0–1
}
```

### Example API Response

```json
{
  "turnId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "It sounds like stress at work is really weighing on you. Here are a few things that might help...",
  "resources": [
    {
      "id": "res-stress-boundaries",
      "title": "Stress and Boundaries",
      "snippet": "When to say no, how to protect rest...",
      "url": "/resources/stress-and-boundaries",
      "type": "article",
      "reason": "Relevant to work stress and boundaries."
    }
  ],
  "suggestedAgents": [
    {
      "agent_id": "stress_burnout",
      "name": "Stress & Burnout Support Agent",
      "reason": "Matches: stress, work, boundaries.",
      "confidence": 0.85
    }
  ],
  "retrievalLogged": true
}
```

### High-Level UI Rendering

1. **Message** — Render `message` as the assistant’s reply (markdown-safe if you allow markdown).
2. **Resource cards** — For each `resources[]`, show a card with `title`, `snippet`, optional `url` (link “Open” or “Read more”). Use `type` for icon or label. On click, call an analytics endpoint to set `suggestions.clicked = true` for the corresponding suggestion row (optional).
3. **Agent cards** — For each `suggestedAgents[]`, show agent name, short `reason`, and optionally a confidence badge. On “Switch to this agent”, create a new session with that `agent_id` or update the current session’s agent and optionally log `suggestions.clicked`.
4. **Crisis** — If the backend has set `session.state.risk_flags` (e.g. `crisis_mentioned`), the reply text will already include the safety message; you can additionally show a persistent banner or modal with 988 and crisis resources.

Types are defined in `src/lib/types.ts` (`ChatApiResponse`, `ResourceCard`, `AgentCard`).

---

## 10. Example System Prompt, User Prompt, and Model Response (PART 3)

### Example system prompt (fragment)

```
You are a supportive AI assistant focused on stress and burnout. Help users explore boundaries, rest, and sustainable pacing. Use reflective listening and normalization. Do not provide medical or clinical advice or diagnose conditions. If crisis language is detected, encourage seeking immediate professional help.

You are a supportive AI. Do not diagnose or provide medical/clinical advice. Encourage professional help when appropriate. Respond only with valid JSON.

You must respond with valid JSON only, no markdown or extra text. Schema:
{ "message": "string", "resources": [...], "suggested_agents": [...] }
```

### Example final user prompt (fragment)

```
## Retrieved context (use to inform your reply and to suggest resources)
[1] When to say no, how to protect rest, and why boundaries are part of sustainable pacing. Start with one small boundary...
[2] Take a break, soften startup, and listen before responding. Tips for heated moments...

## Recent conversation
User: I've been really stressed at work and my partner doesn't get it.
Assistant: That sounds really hard. When you say they don't get it, what do you notice?
User: They think I should just leave work at work.

Respond with valid JSON only (message, resources, suggested_agents).
```

### Example model response schema (ChatStructuredResponse)

```json
{
  "message": "It sounds like you're carrying a lot from work and want to feel heard at home. A few things that might help: setting a small boundary (e.g. no email after 8pm) and having a short 'transition' ritual so you're more present when you get home. Here are some resources that might be useful.",
  "resources": [
    {
      "id": "res-stress-boundaries",
      "title": "Stress and Boundaries",
      "snippet": "When to say no, how to protect rest...",
      "url": "/resources/stress-and-boundaries",
      "type": "article",
      "reason": "Relevant to work stress and boundaries."
    }
  ],
  "suggested_agents": [
    {
      "agent_id": "relationship_communication",
      "name": "Relationship & Couples Communication Agent",
      "reason": "You mentioned your partner; this agent focuses on communication.",
      "confidence": 0.78
    }
  ]
}
```
