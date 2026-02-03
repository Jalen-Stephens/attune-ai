# RAG Dataset and Ingestion

This document explains how to add RAG resources, how to run ingestion, and how to verify chunk counts. RAG content is added via **harvest** (see `docs/rag-harvest.md`) or **single-document ingest** below.

---

## How to Run Ingestion

### Prerequisites

- `.env` must include:
  - `OPENAI_API_KEY`
  - `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
  - `OPENAI_EMBEDDING_DIMENSIONS=1536`
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - `INGEST_SECRET` (token you choose to protect the ingest endpoint)

### Single-document ingest: `POST /api/rag/ingest`

- **Body:** `{ "agentId", "title", "content", "metadata" }` (all strings except optional `metadata` object).
- **Auth:** Send `INGEST_SECRET` via header:
  - `x-ingest-secret: YOUR_SECRET` or
  - `Authorization: Bearer YOUR_SECRET`
- **Response:** `{ "ragDocId", "chunksInserted" }`

See `docs/INGESTION_STATUS.md` for exact `curl` examples.

---

## Verifying Chunk Counts with SQL

After ingestion, you can verify in Supabase SQL Editor:

```sql
-- Count chunks per agent
SELECT agent_id, COUNT(*) AS chunk_count
FROM rag_doc_chunks
GROUP BY agent_id
ORDER BY agent_id;

-- Count docs and chunks total
SELECT
  (SELECT COUNT(*) FROM rag_docs) AS doc_count,
  (SELECT COUNT(*) FROM rag_doc_chunks) AS chunk_count;
```

---

## Common Errors

| Error | Cause | Fix |
|-------|--------|-----|
| **Dimension mismatch** | Embedding vector length ≠ 1536 (e.g. wrong model or `OPENAI_EMBEDDING_DIMENSIONS`). | Use `text-embedding-3-small` and `OPENAI_EMBEDDING_DIMENSIONS=1536`, or align dimensions with your model. |
| **Missing agent_id** | Frontmatter missing `agent_id` or invalid/unknown ID. | Add `agent_id` with an exact value from `agent_profiles.id` (see `src/lib/agents.ts`). |
| **Foreign key violation** | `agent_id` does not exist in `agent_profiles`. | Seed agents first: `POST /api/seed/agent-profiles` with `x-ingest-secret` (same as ingest). Then re-run ingest. |
| **Unauthorized** | Missing or wrong `INGEST_SECRET`. | Set `INGEST_SECRET` in `.env` and send it in `x-ingest-secret` or `Authorization: Bearer`. |
| **No chunks produced** | Content too short or empty after trimming. | Ensure the markdown body has enough text (e.g. a few paragraphs). |
