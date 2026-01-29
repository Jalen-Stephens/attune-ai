/**
 * OpenAI embeddings for RAG. Default: text-embedding-3-small (1536 dimensions).
 * pgvector indexes support max 2000 dimensions; 1536 allows HNSW/IVFFlat indexing.
 */

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

export const EMBEDDING_DIMENSIONS =
  process.env.OPENAI_EMBEDDING_DIMENSIONS != null
    ? parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS, 10)
    : DEFAULT_DIMENSIONS;

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_MODEL;

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8191),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('OpenAI embeddings: invalid response shape');
  }
  return embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const inputs = texts.map((t) => t.slice(0, 8191));

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[]; index?: number }>;
  };
  const sorted = (data.data ?? [])
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const embeddings = sorted.map((d) => d.embedding).filter(Boolean) as number[][];
  for (let i = 0; i < embeddings.length; i++) {
    if (embeddings[i].length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embeddings[i].length} (chunk ${i + 1}). Ensure OPENAI_EMBEDDING_MODEL and OPENAI_EMBEDDING_DIMENSIONS match your model.`
      );
    }
  }
  return embeddings;
}

/**
 * Validate that a single embedding has the expected dimensions (e.g. 1536 for text-embedding-3-small).
 */
export function validateEmbeddingDimensions(embedding: number[]): void {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}. Ensure OPENAI_EMBEDDING_DIMENSIONS matches your model.`
    );
  }
}
