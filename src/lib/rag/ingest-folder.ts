/**
 * Discover and read all .md files under rag_sources/ for batch ingestion.
 * Uses process.cwd() so it works when run from project root (e.g. next dev).
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { parseFrontmatter } from '@/lib/rag/frontmatter';
import { ingestDocument } from '@/lib/rag/ingest';

const RAG_SOURCES_DIR = 'rag_sources';

export type IngestFolderResult = {
  filesProcessed: number;
  docsInserted: number;
  totalChunksInserted: number;
  failures: Array<{ file: string; error: string }>;
};

/**
 * Recursively find all .md files under dir.
 */
async function findMarkdownFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      const sub = await findMarkdownFiles(fullPath, baseDir);
      files.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Get the project root (where rag_sources/ lives). In Next.js API routes, process.cwd() is typically the project root.
 */
function getRagSourcesRoot(): string {
  const cwd = process.cwd();
  return path.join(cwd, RAG_SOURCES_DIR);
}

/**
 * Read all .md files under rag_sources/, parse frontmatter, and ingest each.
 * Uses agent_id from frontmatter unless overrideAgentId is provided.
 */
export async function ingestFolder(overrideAgentId?: string): Promise<IngestFolderResult> {
  const root = getRagSourcesRoot();
  let files: string[];
  try {
    files = await findMarkdownFiles(root, root);
  } catch (err) {
    throw new Error(
      `Failed to read rag_sources directory at ${root}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const failures: Array<{ file: string; error: string }> = [];
  let docsInserted = 0;
  let totalChunksInserted = 0;

  for (const filePath of files) {
    const relativePath = path.relative(root, filePath);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const parsed = parseFrontmatter(raw);
      if (!parsed) {
        failures.push({ file: relativePath, error: 'Missing or invalid frontmatter (need title, agent_id)' });
        continue;
      }
      const agentId = overrideAgentId ?? parsed.frontmatter.agent_id;
      const metadata = {
        type: parsed.frontmatter.type,
        tags: parsed.frontmatter.tags,
        ...(parsed.frontmatter.url && { url: parsed.frontmatter.url }),
      };
      const result = await ingestDocument({
        agentId,
        title: parsed.frontmatter.title,
        content: parsed.body,
        metadata,
      });
      docsInserted += 1;
      totalChunksInserted += result.chunksInserted;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ file: relativePath, error: message });
    }
  }

  return {
    filesProcessed: files.length,
    docsInserted,
    totalChunksInserted,
    failures,
  };
}
