# RAG Ingestion Status

Summary of what was implemented and how to run ingestion locally.

---

## Files Created or Modified

### New files

- **`rag_sources/`** — 20 markdown resources (5 per folder):
  - `rag_sources/sleep/` — 5 files (`sleep_insomnia`)
  - `rag_sources/relationships/` — 5 files (`relationship_communication`)
  - `rag_sources/cravings/` — 5 files (`addiction_support`)
  - `rag_sources/focus/` — 5 files (`adhd_executive`)
- **`src/lib/rag/frontmatter.ts`** — Parse YAML frontmatter from markdown (title, type, tags, url, agent_id).
- **`src/lib/rag/chunk.ts`** — Chunker: 200–800 token chunks, target 450, overlap 80; merges small trailing chunks.
- **`src/lib/rag/ingest.ts`** — Shared ingest pipeline: insert `rag_docs`, chunk, embed (OpenAI), insert `rag_doc_chunks`; uses service role client.
- **`src/lib/rag/ingest-folder.ts`** — Discovers `rag_sources/**/*.md`, parses frontmatter, calls ingest pipeline per file.
- **`src/app/api/rag/ingest-folder/route.ts`** — `POST /api/rag/ingest-folder` (protected by `INGEST_SECRET`).
- **`docs/RAG_DATASET.md`** — How to add resources, frontmatter, run ingestion, verify chunks, common errors.
- **`docs/INGESTION_STATUS.md`** — This file.

### Modified files

- **`src/app/api/rag/ingest/route.ts`** — Uses shared `ingestDocument`, returns `{ ragDocId, chunksInserted }`, protected by `INGEST_SECRET`.
- **`src/lib/rag/embeddings.ts`** — Validates embedding dimensions (1536); throws clear error on mismatch.
- **`src/lib/rag/index.ts`** — Exports `splitIntoChunks` from `chunk.ts` instead of `chunking.ts`.
- **`src/utils/supabase/server.ts`** — Added `createServiceRoleClient()` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **`.env.example`** — Added `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_SECRET`; existing OpenAI and Supabase vars documented for RAG.

---

## How to Run Ingestion Locally

1. **Seed agent profiles (required once).** If `agent_profiles` is empty in Supabase, RAG ingest will fail with a foreign key error. Seed the agents first:
   ```bash
   curl -X POST http://localhost:3000/api/seed/agent-profiles \
     -H "Content-Type: application/json" \
     -H "x-ingest-secret: YOUR_INGEST_SECRET" \
     -d '{}'
   ```
   Then run the ingest-folder command below.

2. **Set environment variables** (copy from `.env.example` and fill in values):
   - `OPENAI_API_KEY`
   - `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` (default)
   - `OPENAI_EMBEDDING_DIMENSIONS=1536`
   - `SUPABASE_URL` (same as project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Settings → API)
   - `INGEST_SECRET` (choose a secret token; e.g. a long random string)

3. **Start the app** (from project root):
   ```bash
   npm run dev
   ```

4. **Ingest all markdown files** under `rag_sources/`:
   ```bash
   curl -X POST http://localhost:3000/api/rag/ingest-folder \
     -H "Content-Type: application/json" \
     -H "x-ingest-secret: YOUR_INGEST_SECRET" \
     -d '{}'
   ```
   Or with override agent (optional):
   ```bash
   curl -X POST http://localhost:3000/api/rag/ingest-folder \
     -H "Content-Type: application/json" \
     -H "x-ingest-secret: YOUR_INGEST_SECRET" \
     -d '{"overrideAgentId":"sleep_insomnia"}'
   ```

4. **Ingest a single document** (example):
   ```bash
   curl -X POST http://localhost:3000/api/rag/ingest \
     -H "Content-Type: application/json" \
     -H "x-ingest-secret: YOUR_INGEST_SECRET" \
     -d '{
       "agentId": "sleep_insomnia",
       "title": "My Custom Guide",
       "content": "## When to use\nUse this when...\n\n## Steps\n1. First...\n2. Then...",
       "metadata": { "type": "guide", "tags": ["sleep"] }
     }'
   ```

Replace `YOUR_INGEST_SECRET` with the value of `INGEST_SECRET` in your `.env`.

---

## Exact cURL Commands (copy-paste)

**Ingest folder (all 20 files):**
```bash
curl -X POST http://localhost:3000/api/rag/ingest-folder \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -d '{}'
```

**Single doc:**
```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -d '{"agentId":"sleep_insomnia","title":"Test","content":"Your markdown body here. At least a paragraph so chunking produces chunks.","metadata":{}}'
```

Use `Authorization: Bearer YOUR_INGEST_SECRET` in place of `x-ingest-secret` if you prefer.
