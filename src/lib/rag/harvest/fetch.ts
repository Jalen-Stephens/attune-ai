/**
 * Download URL with retries, rate limit, and max size.
 */

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20MB
const DEFAULT_RATE_LIMIT_MS = 1000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;

export type FetchResult = {
  contentType: string;
  buffer: Buffer;
  finalUrl: string;
};

function getUserAgent(): string {
  return (
    process.env.HARVEST_USER_AGENT ||
    'AttuneRAGHarvester/1.0 (compatible; +https://github.com/attune-ai)'
  );
}

function getMaxBytes(): number {
  const v = process.env.HARVEST_MAX_BYTES;
  if (v) {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_MAX_BYTES;
}

let lastFetchTime = 0;

function rateLimit(): void {
  const ms = parseInt(process.env.HARVEST_RATE_LIMIT_MS ?? '', 10) || DEFAULT_RATE_LIMIT_MS;
  const now = Date.now();
  const elapsed = now - lastFetchTime;
  if (elapsed < ms && lastFetchTime > 0) {
    const delay = ms - elapsed;
    // Synchronous sleep for simplicity in CLI
    const deadline = Date.now() + delay;
    while (Date.now() < deadline) {
      // busy wait; could use setTimeout in Promise for true async
    }
  }
  lastFetchTime = Date.now();
}

/**
 * Fetch URL with retries and backoff. Respects rate limit and max size.
 */
export async function fetchUrl(url: string): Promise<FetchResult> {
  const maxBytes = getMaxBytes();
  const retries = DEFAULT_RETRIES;
  const retryDelayMs = DEFAULT_RETRY_DELAY_MS;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
    rateLimit();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': getUserAgent() },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
      const contentLength = res.headers.get('content-length');
      if (contentLength) {
        const len = parseInt(contentLength, 10);
        if (!Number.isNaN(len) && len > maxBytes) {
          throw new Error(`Content length ${len} exceeds max ${maxBytes}`);
        }
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      const body = res.body;
      if (!body) throw new Error('No response body');
      const reader = body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          throw new Error(`Response size ${total} exceeds max ${maxBytes}`);
        }
        chunks.push(value);
      }
      const buffer = Buffer.concat(chunks);
      const finalUrl = res.url ?? url;
      return { contentType, buffer, finalUrl };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

/**
 * Check if content type is PDF.
 */
export function isPdfContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('application/pdf');
}

/**
 * Check if content type is HTML.
 */
export function isHtmlContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return lower.includes('text/html') || lower.includes('application/xhtml');
}
