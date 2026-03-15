# RAG Ingestion Status

Summary of what was implemented and how to run ingestion locally.

---

## Files

- **`src/lib/rag/frontmatter.ts`** — Parse YAML frontmatter from markdown (used by harvest normalize output).
- **`src/lib/rag/chunk.ts`** — Chunker: 200–800 token chunks, target 450, overlap 80; merges small trailing chunks.
- **`src/lib/rag/ingest.ts`** — Shared ingest pipeline: insert `rag_docs`, chunk, embed (OpenAI), insert `rag_doc_chunks`; uses service role client.
- **`src/app/api/rag/ingest/route.ts`** — `POST /api/rag/ingest` (protected by `INGEST_SECRET`).
- **`docs/RAG_DATASET.md`** — How to run ingestion, verify chunks, common errors.
- **`docs/rag-harvest.md`** — Harvest: Brave Search + fetch/extract, ingest into RAG.

RAG content is added via **harvest** (`pnpm rag:harvest`) or **single-document ingest** (`POST /api/rag/ingest`).

---

## How to Run Ingestion Locally

1. **Seed agent profiles (required once).** If `agent_profiles` is empty in Supabase, RAG ingest will fail with a foreign key error. Seed the agents first:
   ```bash
   curl -X POST http://localhost:3000/api/seed/agent-profiles \
     -H "Content-Type: application/json" \
     -H "x-ingest-secret: YOUR_INGEST_SECRET" \
     -d '{}'
   ```

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

4. **Ingest via harvest** (see `docs/rag-harvest.md`):
   ```bash
   pnpm rag:harvest --agent sleep_insomnia --limit 20
   ```
   Or **ingest a single document**:
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

**Single doc:**
```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -d '{"agentId":"sleep_insomnia","title":"Test","content":"Your markdown body here. At least a paragraph so chunking produces chunks.","metadata":{}}'
```

Use `Authorization: Bearer YOUR_INGEST_SECRET` in place of `x-ingest-secret` if you prefer.

---

## Removing folder-sourced docs from the database

If you previously ingested from the old `rag_sources/` folder and want to remove only those documents (keeping harvest-sourced docs), run in **Supabase Dashboard → SQL Editor**:

```sql
-- Delete only docs that came from rag_sources/ (folder ingest). Harvest-sourced docs have source_url/content_hash in metadata.
DELETE FROM rag_docs
WHERE (metadata->>'source_url' IS NULL AND metadata->>'content_hash' IS NULL);
```

This removes only folder-sourced documents and their chunks (via cascade). All other data is unchanged.

---

## Removing tiny test articles

If you added short placeholder articles for testing (e.g. one-sentence “Effective Communication Tips” or “Building a Sober Support Network” style snippets that aren’t real links or articles), run in **Supabase Dashboard → SQL Editor**:

```sql
-- Preview: list docs that will be removed (content under 500 chars)
SELECT id, agent_id, title, LENGTH(content) AS len
FROM rag_docs
WHERE LENGTH(content) < 500
ORDER BY agent_id, title;

-- Delete those docs (chunks removed via CASCADE)
DELETE FROM rag_docs
WHERE LENGTH(content) < 500;
```

Adjust `500` if your real articles are shorter. After running, those test articles will no longer appear in “Suggested resources” in the dashboard chat.
