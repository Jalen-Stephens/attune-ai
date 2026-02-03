/**
 * Pluggable search: Brave (full raw response stored), file fallback.
 * 1 Brave search call = 1 API request; enforce run-level cap via caller.
 */

export type SearchResultItem = {
  url: string;
  title: string;
  snippet: string;
  /** Full Brave API result object for this result (Pro enriched data). */
  rawResult: Record<string, unknown>;
};

export type SearchQueryResult = {
  query: string;
  results: SearchResultItem[];
  /** Full raw Brave API response for this query (entire JSON). */
  rawResponse: Record<string, unknown>;
  requestsUsed: number;
};

export type SearchOptions = {
  limitPerQuery?: number;
  /** Max search requests allowed this run; stop before exceeding. */
  maxSearchRequests?: number;
  /** Current count of requests already used this run (caller maintains). */
  requestsUsedSoFar?: number;
};

const DEFAULT_LIMIT = 10;
const BRAVE_WEB_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Run Brave web search for one query. Returns normalized results + full raw response.
 * Uses X-Subscription-Token for API key.
 */
async function braveSearch(
  query: string,
  limit: number,
  apiKey: string
): Promise<{ results: SearchResultItem[]; rawResponse: Record<string, unknown> }> {
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(limit, 20)),
  });
  const res = await fetch(`${BRAVE_WEB_SEARCH_URL}?${params}`, {
    method: 'GET',
    headers: {
      'X-Subscription-Token': apiKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brave Search API error ${res.status}: ${text}`);
  }
  const rawResponse = (await res.json()) as Record<string, unknown>;
  const web = rawResponse.web as { results?: Array<Record<string, unknown>> } | undefined;
  const rawResults = web?.results ?? [];
  const results: SearchResultItem[] = rawResults.slice(0, limit).map((r) => ({
    url: String(r.url ?? ''),
    title: String(r.title ?? ''),
    snippet: String(r.description ?? r.snippet ?? ''),
    rawResult: { ...r },
  }));
  return { results, rawResponse };
}

/**
 * Search using Brave API for each query. Returns combined results and all raw responses.
 * Respects maxSearchRequests: stops issuing new requests when at or over cap.
 */
export async function searchWithBrave(
  queries: string[],
  options: SearchOptions = {}
): Promise<{ queryResults: SearchQueryResult[]; totalRequestsUsed: number }> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_API_KEY is not set');
  }
  const limit = options.limitPerQuery ?? DEFAULT_LIMIT;
  const maxRequests = options.maxSearchRequests ?? Infinity;
  let requestsUsedSoFar = options.requestsUsedSoFar ?? 0;

  const queryResults: SearchQueryResult[] = [];

  for (const query of queries) {
    if (requestsUsedSoFar >= maxRequests) {
      break;
    }
    const { results, rawResponse } = await braveSearch(query, limit, apiKey);
    requestsUsedSoFar += 1;
    queryResults.push({
      query,
      results,
      rawResponse,
      requestsUsed: 1,
    });
  }

  return {
    queryResults,
    totalRequestsUsed: queryResults.reduce((s, q) => s + q.requestsUsed, 0),
  };
}

/**
 * Fallback: read URLs from harvest_urls/<agentSlug>.txt (one URL per line).
 * Returns zero API requests; rawResponse per "query" is a minimal stub.
 */
export async function searchWithUrlFile(
  agentSlug: string,
  baseDir: string = 'harvest_urls'
): Promise<{ queryResults: SearchQueryResult[]; totalRequestsUsed: number }> {
  const path = await import('path');
  const fs = await import('fs/promises');
  const filePath = path.join(process.cwd(), baseDir, `${agentSlug}.txt`);
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return { queryResults: [], totalRequestsUsed: 0 };
  }
  const urls = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const results: SearchResultItem[] = urls.map((url) => ({
    url,
    title: url,
    snippet: '',
    rawResult: { url, title: url, description: '' },
  }));
  const queryResults: SearchQueryResult[] = [
    {
      query: `file:${agentSlug}.txt`,
      results,
      rawResponse: { source: 'harvest_urls', agentSlug, count: results.length },
      requestsUsed: 0,
    },
  ];
  return { queryResults, totalRequestsUsed: 0 };
}

/**
 * Run search for an agent: use Brave if API key set and file doesn't exist or is empty;
 * otherwise use URL file. Enforces maxSearchRequests across all queries.
 */
export async function searchForAgent(
  agentSlug: string,
  queries: string[],
  options: SearchOptions & { urlFileBaseDir?: string } = {}
): Promise<{ queryResults: SearchQueryResult[]; totalRequestsUsed: number }> {
  const urlFileBaseDir = options.urlFileBaseDir ?? 'harvest_urls';

  if (!process.env.BRAVE_API_KEY) {
    const fileResult = await searchWithUrlFile(agentSlug, urlFileBaseDir);
    if (fileResult.queryResults.length > 0 && fileResult.queryResults[0].results.length > 0) {
      return fileResult;
    }
    throw new Error('No BRAVE_API_KEY and no harvest URL file found');
  }

  const fileResult = await searchWithUrlFile(agentSlug, urlFileBaseDir);
  if (fileResult.queryResults.length > 0 && fileResult.queryResults[0].results.length > 0) {
    return fileResult;
  }

  return searchWithBrave(queries, options);
}
