/**
 * Harvest run report types and write to disk (report.json + brave_responses.json).
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export type HarvestRunReport = {
  agentSlug: string;
  startedAt: string;
  finishedAt: string;
  urlsFound: number;
  urlsIngested: number;
  skippedDuplicates: number;
  failed: Array<{ url: string; reason: string }>;
  searchRequestsUsed: number;
  /** Optional: paths to saved artifacts */
  reportPath?: string;
  braveResponsesPath?: string;
};

export type BraveResponseEntry = {
  query: string;
  rawResponse: Record<string, unknown>;
};

/**
 * Write report JSON and optional brave_responses.json to run dir.
 * Run dir: ./rag_harvest_runs/<timestamp>/<agent_slug>/
 */
export async function writeReport(
  runDir: string,
  report: HarvestRunReport,
  braveResponses?: BraveResponseEntry[]
): Promise<void> {
  await mkdir(runDir, { recursive: true });
  const reportPath = path.join(runDir, 'report.json');
  await writeFile(reportPath, JSON.stringify({ ...report, reportPath }, null, 2), 'utf-8');

  if (braveResponses !== undefined && braveResponses.length > 0) {
    const bravePath = path.join(runDir, 'brave_responses.json');
    await writeFile(bravePath, JSON.stringify(braveResponses, null, 2), 'utf-8');
  }
}

/**
 * Create run directory path: rag_harvest_runs/<timestamp>_<agent_slug> or rag_harvest_runs/<timestamp>/<agent_slug>.
 */
export function getRunDir(baseDir: string, timestamp: string, agentSlug: string): string {
  return path.join(baseDir, timestamp, agentSlug);
}

/**
 * Timestamp string for run dir (ISO-like, filesystem safe).
 */
export function runTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
