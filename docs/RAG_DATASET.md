# RAG Dataset and Ingestion

This document explains how to add new RAG resources, required frontmatter, how to run ingestion, and how to verify chunk counts.

---

## Adding a New Resource (Markdown File)

1. **Choose the right folder** under `rag_sources/`:
   - `rag_sources/sleep/` — Sleep & Insomnia Support (`sleep_insomnia`)
   - `rag_sources/relationships/` — Relationship & Couples Communication (`relationship_communication`)
   - `rag_sources/cravings/` — Addiction Support (`addiction_support`)
   - `rag_sources/focus/` — ADHD & Executive Functioning (`adhd_executive`)

2. **Create a `.md` file** with YAML frontmatter at the top, then well-structured markdown (When to use, Steps, Notes). Keep each resource roughly 200–500 words. Use original, non-clinical coaching language.

3. **Required frontmatter keys** (see below). After adding the file, run the ingest-folder endpoint to load it into RAG.

---

## Required Frontmatter Keys

Every markdown file under `rag_sources/` must have:

| Key        | Required | Description |
|-----------|----------|-------------|
| `title`   | Yes      | Display title of the resource. |
| `type`    | Yes      | One of: `exercise`, `worksheet`, `guide`, `article`. |
| `tags`    | Yes      | Array of tags, e.g. `[sleep hygiene, routine]`. |
| `agent_id`| Yes      | **Exact** agent ID used in the DB (see `src/lib/agents.ts`). Must match an existing `agent_profiles.id`. |
| `url`     | No       | Optional URL for the resource. |

Example:

```yaml
---
title: Building a Wind-Down Routine
type: guide
tags: [sleep hygiene, routine, evening]
agent_id: sleep_insomnia
---
```

**Important:** `agent_id` must match an ID from your agent profiles (e.g. `sleep_insomnia`, `relationship_communication`, `addiction_support`, `adhd_executive`). If you use an ID that does not exist in `agent_profiles`, ingestion will fail due to foreign key constraints.

---

## How to Run Ingestion

### Prerequisites

- `.env` must include:
  - `OPENAI_API_KEY`
  - `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
  - `OPENAI_EMBEDDING_DIMENSIONS=1536`
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - `INGEST_SECRET` (token you choose to protect the ingest endpoints)

### Single-document ingest: `POST /api/rag/ingest`

- **Body:** `{ "agentId", "title", "content", "metadata" }` (all strings except optional `metadata` object).
- **Auth:** Send `INGEST_SECRET` via header:
  - `x-ingest-secret: YOUR_SECRET` or
  - `Authorization: Bearer YOUR_SECRET`
- **Response:** `{ "ragDocId", "chunksInserted" }`

### Folder ingest: `POST /api/rag/ingest-folder`

- Reads all `.md` files under `rag_sources/**`.
- Parses frontmatter and uses `agent_id` from each file (unless you pass `overrideAgentId` in the body).
- **Auth:** Same as above (`x-ingest-secret` or `Authorization: Bearer`).
- **Response:** `{ "filesProcessed", "docsInserted", "totalChunksInserted", "failures": [{ "file", "error" }] }`

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
