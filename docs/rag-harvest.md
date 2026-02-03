# RAG Harvest

Automated RAG Harvester: for each agent, search the web (Brave Search API), download PDFs and articles, extract and normalize to markdown with frontmatter, dedupe by content hash, and ingest into the existing RAG pipeline.

---

## How to run

- **Single agent**:  
  `pnpm rag:harvest --agent sleep_insomnia --limit 20`

- **All agents** (with harvest config):  
  `pnpm rag:harvest --all --limit 20`

- **Dry run** (no ingest, still fetch/extract/report):  
  `pnpm rag:harvest --agent anxiety_panic --limit 5 --dry-run`

Reports and artifacts are written under:  
`./rag_harvest_runs/<timestamp>/<agent_slug>/`

- `report.json` — urls_found, urls_ingested, skipped_duplicates, failed, **search_requests_used**
- `brave_responses.json` — full Brave API response(s) per query (Pro enriched data)
- Optional: normalized markdown files (e.g. `<content_hash>.md`) for debugging

---

## Env vars

| Variable | Description |
|----------|-------------|
| `BRAVE_API_KEY` | Brave Search API key. **Keep in `.env` only; never commit.** |
| `HARVEST_USER_AGENT` | User-Agent for HTTP fetches (default: AttuneRAGHarvester/1.0) |
| `HARVEST_MAX_RESULTS` | Max results per search query (default: 20) |
| `HARVEST_RATE_LIMIT_MS` | Min ms between URL fetches (default: 1000) |
| `HARVEST_MAX_SEARCH_REQUESTS` | Max Brave API calls per run (e.g. 500–800 to stay under 1000) |

Also required for ingest: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

---

## Brave API cost (~$5 per 1000 requests)

- **1 search request = 1 API call.** Each query uses one request.
- To stay under 1000 requests:
  - Use **few queries per agent** in harvest config (e.g. 2–5).
  - Prefer **single-agent** runs: `--agent sleep_insomnia`.
  - Set **`HARVEST_MAX_SEARCH_REQUESTS`** (e.g. 500 or 800).
  - Use the **URL-file fallback** for known-good URLs so **zero** Brave calls are used for that agent.

---

## Config shape

Harvest config lives in `src/lib/rag/harvest/config.ts`: map **agent_slug** → `{ searchQueries, allowlistedDomains, keywords? }`.

Example for two agents:

**sleep_insomnia**

- `searchQueries`: e.g. `["sleep hygiene handout site:.gov", "insomnia CBT worksheet site:.edu", "sleep wind-down routine guide"]`
- `allowlistedDomains`: e.g. `["nih.gov", "cdc.gov", "sleepfoundation.org", "mayoclinic.org", "health.harvard.edu", "apa.org"]`
- `keywords`: e.g. `["handout", "worksheet", "guide", "fact sheet", "sleep hygiene"]`

**anxiety_panic**

- `searchQueries`: e.g. `["anxiety coping handout site:.gov", "panic disorder self-help site:.edu", "grounding techniques worksheet"]`
- `allowlistedDomains`: e.g. `["nimh.nih.gov", "adaa.org", "apa.org", "mayoclinic.org", "health.harvard.edu"]`
- `keywords`: e.g. `["handout", "worksheet", "guide", "fact sheet", "coping"]`

Fewer, higher-value queries (e.g. `site:.gov`, `site:.edu`) reduce API usage and improve quality.

---

## Fallback: URL file (no Brave requests)

If `BRAVE_API_KEY` is not set, or for an agent with a URL file, the harvester can read URLs from a local file and make **zero** Brave requests for that agent.

- **Path**: `harvest_urls/<agent_slug>.txt`
- **Format**: one URL per line; lines starting with `#` are ignored.

Example: `harvest_urls/sleep_insomnia.txt`

```
https://www.nia.nih.gov/health/sleep/sleep-hygiene
https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html
# optional comment
```

---

## Stored data

- **Run artifacts**: Full Brave API response(s) in `brave_responses.json` (no truncation; Pro enriched data preserved).
- **Per-doc metadata**: Each ingested doc has `rag_docs.metadata.brave_result` = full Brave result object for that URL (provenance + enriched fields).

---

## Tests

- **Dedupe**: `contentHash()` — same text → same hash; whitespace normalization.
- **PDF**: Reject invalid/short PDF; export MIN_PDF_TEXT_LENGTH and MIN_PDF_ALPHA_RATIO.
- **HTML**: Readability + turndown; reject when content too short.

Run: `pnpm test`
