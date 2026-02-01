/**
 * In-memory cache for tool results, keyed by sessionId.
 * Allows Dashboard to poll and display findProviders/getRagResources results
 * when Vapi's tool-calls-result doesn't reach the client.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

type CachedResult<T> = { data: T; storedAt: number };

const cache = new Map<
  string,
  {
    findProviders?: CachedResult<{ providers: unknown[]; disclaimer?: string }>;
    getRagResources?: CachedResult<{ resources: unknown[] }>;
  }
>();

function prune() {
  const now = Date.now();
  for (const [sid, entries] of cache.entries()) {
    const latest = Math.max(
      entries.findProviders?.storedAt ?? 0,
      entries.getRagResources?.storedAt ?? 0
    );
    if (now - latest > TTL_MS) cache.delete(sid);
  }
}

export function storeFindProviders(
  sessionId: string,
  providers: unknown[],
  disclaimer?: string
): void {
  if (!sessionId) return;
  const existing = cache.get(sessionId) ?? {};
  existing.findProviders = { data: { providers, disclaimer }, storedAt: Date.now() };
  cache.set(sessionId, existing);
  prune();
}

export function storeGetRagResources(
  sessionId: string,
  resources: unknown[]
): void {
  if (!sessionId) return;
  const existing = cache.get(sessionId) ?? {};
  existing.getRagResources = { data: { resources }, storedAt: Date.now() };
  cache.set(sessionId, existing);
  prune();
}

export function getToolResults(sessionId: string): {
  findProviders?: { providers: unknown[]; disclaimer?: string; storedAt: number };
  getRagResources?: { resources: unknown[]; storedAt: number };
} | null {
  if (!sessionId) return null;
  const entries = cache.get(sessionId);
  if (!entries) return null;
  const out: ReturnType<typeof getToolResults> = {};
  if (entries.findProviders) {
    out.findProviders = {
      ...entries.findProviders.data,
      storedAt: entries.findProviders.storedAt,
    };
  }
  if (entries.getRagResources) {
    out.getRagResources = {
      ...entries.getRagResources.data,
      storedAt: entries.getRagResources.storedAt,
    };
  }
  return Object.keys(out).length ? out : null;
}
