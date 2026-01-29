/**
 * Semantic chunking for RAG: split text into 200–800 token chunks (target 450, overlap 80).
 * Uses paragraph/sentence boundaries when possible; merges small trailing sections to avoid tiny chunks.
 * Approximate token count: ~4 chars per token for English.
 */

const APPROX_CHARS_PER_TOKEN = 4;
const MIN_CHUNK_TOKENS = 200;
const MAX_CHUNK_TOKENS = 800;
const TARGET_CHUNK_TOKENS = 450;
const OVERLAP_TOKENS = 80;

export interface ChunkWithIndex {
  content: string;
  chunk_index: number;
  start_char: number;
  end_char: number;
}

/**
 * Rough token count from character length (OpenAI-style English).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

/**
 * Split content into chunks of ~200–800 tokens with overlap.
 * Prefers splitting on double newlines, then single newlines, then sentences.
 * Merges a final chunk that would be too small (< MIN_CHUNK_TOKENS) into the previous chunk.
 */
export function splitIntoChunks(content: string): ChunkWithIndex[] {
  const chunks: ChunkWithIndex[] = [];
  const minChars = MIN_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;
  const maxChars = MAX_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;
  const targetChars = TARGET_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN;

  let start = 0;
  let index = 0;

  while (start < content.length) {
    let end = Math.min(start + maxChars, content.length);
    let slice = content.slice(start, end);

    if (slice.length <= maxChars && start + slice.length >= content.length) {
      if (slice.trim().length > 0) {
        chunks.push({
          content: slice.trim(),
          chunk_index: index,
          start_char: start,
          end_char: start + slice.length,
        });
        index++;
      }
      break;
    }

    const searchStart = Math.max(0, targetChars - 100);
    const searchEnd = Math.min(slice.length, maxChars + 50);
    const searchRegion = content.slice(start + searchStart, start + searchEnd);

    let splitAt = -1;
    const doubleNewline = searchRegion.indexOf('\n\n');
    const singleNewline = searchRegion.indexOf('\n');
    const sentenceEnd = searchRegion.search(/[.!?]\s+/);

    if (doubleNewline >= 0 && doubleNewline + searchStart <= maxChars) {
      splitAt = searchStart + doubleNewline + 2;
    } else if (singleNewline >= 0 && singleNewline + searchStart <= maxChars) {
      splitAt = searchStart + singleNewline + 1;
    } else if (sentenceEnd >= 0 && sentenceEnd + searchStart <= maxChars) {
      splitAt = searchStart + sentenceEnd + 1;
    } else if (searchRegion.length > 0) {
      splitAt = Math.min(targetChars, slice.length);
    }

    if (splitAt <= 0) splitAt = Math.min(targetChars, slice.length);
    if (splitAt <= 0) splitAt = 1;
    const chunkContent = content.slice(start, start + splitAt).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        chunk_index: index,
        start_char: start,
        end_char: start + splitAt,
      });
      index++;
    }
    start += Math.max(1, splitAt - overlapChars);
    if (start >= content.length) break;
  }

  // Merge tiny trailing chunk into previous to avoid very small chunks
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    const lastTokens = estimateTokens(last.content);
    if (lastTokens < MIN_CHUNK_TOKENS) {
      const prev = chunks[chunks.length - 2];
      const mergedContent = prev.content + '\n\n' + last.content;
      chunks.pop();
      chunks[chunks.length - 1] = {
        content: mergedContent.trim(),
        chunk_index: prev.chunk_index,
        start_char: prev.start_char,
        end_char: last.end_char,
      };
    }
  }

  return chunks;
}
