/**
 * Harvest orchestrator: search -> fetch -> extract -> normalize -> dedupe -> ingest -> report.
 */

import { getHarvestConfig } from './config';
import { searchForAgent, type SearchResultItem, type SearchQueryResult } from './search';
import { fetchUrl, isPdfContentType, isHtmlContentType } from './fetch';
import { extractPdf } from './extract_pdf';
import { extractHtml } from './extract_html';
import { normalizeToMarkdown } from './normalize';
import { contentHash, isAlreadyIngested } from './dedupe';
import { ingestHarvestDocument } from './ingest';
import {
  writeReport,
  getRunDir,
  runTimestamp,
  type HarvestRunReport,
  type BraveResponseEntry,
} from './report';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

const RAG_HARVEST_RUNS = 'rag_harvest_runs';

export type RunHarvestOptions = {
  agentSlug: string;
  limit?: number;
  dryRun?: boolean;
  maxSearchRequests?: number;
  saveMarkdown?: boolean;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function runHarvestForAgent(options: RunHarvestOptions): Promise<HarvestRunReport> {
  const { agentSlug, limit = 20, dryRun = false, saveMarkdown = true } = options;
  const startedAt = new Date().toISOString();
  const config = getHarvestConfig(agentSlug);
  const agentId = agentSlug; // agent_profiles.id is the slug

  const maxSearchRequests =
    options.maxSearchRequests ??
    (parseInt(process.env.HARVEST_MAX_SEARCH_REQUESTS ?? '', 10) || 500);

  const report: HarvestRunReport = {
    agentSlug,
    startedAt,
    finishedAt: '',
    urlsFound: 0,
    urlsIngested: 0,
    skippedDuplicates: 0,
    failed: [],
    searchRequestsUsed: 0,
  };

  const braveResponses: BraveResponseEntry[] = [];
  let totalSearchRequestsUsed = 0;

  if (!config) {
    report.finishedAt = new Date().toISOString();
    report.failed.push({ url: '(config)', reason: `No harvest config for agent ${agentSlug}` });
    return report;
  }

  const limitPerQuery = Math.min(limit, parseInt(process.env.HARVEST_MAX_RESULTS ?? '20', 10) || 20);

  let queryResults: SearchQueryResult[];
  try {
    const result = await searchForAgent(agentSlug, config.searchQueries, {
      limitPerQuery,
      maxSearchRequests,
      requestsUsedSoFar: totalSearchRequestsUsed,
    });
    queryResults = result.queryResults;
    totalSearchRequestsUsed = result.totalRequestsUsed;
  } catch (err) {
    report.finishedAt = new Date().toISOString();
    report.searchRequestsUsed = totalSearchRequestsUsed;
    report.failed.push({
      url: '(search)',
      reason: err instanceof Error ? err.message : String(err),
    });
    return report;
  }

  report.searchRequestsUsed = totalSearchRequestsUsed;

  for (const qr of queryResults) {
    braveResponses.push({ query: qr.query, rawResponse: qr.rawResponse });
  }

  const allResults: Array<{ item: SearchResultItem; queryUsed: string }> = [];
  for (const qr of queryResults) {
    for (const item of qr.results) {
      allResults.push({ item, queryUsed: qr.query });
    }
  }
  report.urlsFound = allResults.length;

  const timestamp = runTimestamp();
  const runDir = getRunDir(path.join(process.cwd(), RAG_HARVEST_RUNS), timestamp, agentSlug);
  await mkdir(runDir, { recursive: true });

  const retrievedAt = new Date().toISOString();

  for (const { item, queryUsed } of allResults) {
    const url = item.url;
    try {
      const { contentType, buffer, finalUrl } = await fetchUrl(url);
      const domain = getDomain(finalUrl);

      let title: string;
      let body: string;
      let contentTypeLabel: 'pdf' | 'article' = 'article';

      if (isPdfContentType(contentType)) {
        const extracted = await extractPdf(buffer);
        title = extracted.text.slice(0, 100).trim() || item.title || url;
        body = extracted.text;
        contentTypeLabel = 'pdf';
      } else if (isHtmlContentType(contentType)) {
        const html = buffer.toString('utf-8');
        const extracted = await extractHtml(html, finalUrl);
        title = extracted.title || item.title || url;
        body = extracted.markdown;
        contentTypeLabel = 'article';
      } else {
        report.failed.push({ url, reason: `Unsupported content type: ${contentType}` });
        continue;
      }

      const { markdown } = normalizeToMarkdown({
        title,
        body,
        sourceUrl: finalUrl,
        retrievedAt,
        domain,
        contentType: contentTypeLabel,
        agentSlug,
        queryUsed,
      });

      const hash = contentHash(markdown);
      const already = await isAlreadyIngested(agentId, hash);
      if (already) {
        report.skippedDuplicates += 1;
        continue;
      }

      if (!dryRun) {
        await ingestHarvestDocument({
          agentId,
          title,
          content: markdown,
          sourceUrl: finalUrl,
          retrievedAt,
          contentType: contentTypeLabel,
          domain,
          queryUsed,
          agentSlug,
          contentHash: hash,
          braveResult: item.rawResult,
        });
        report.urlsIngested += 1;
      } else {
        report.urlsIngested += 1; // count as "would ingest" in dry run
      }

      if (saveMarkdown) {
        const safeName = `${hash.slice(0, 12)}.md`;
        const mdPath = path.join(runDir, safeName);
        await writeFile(mdPath, markdown, 'utf-8').catch(() => {});
      }
    } catch (err) {
      report.failed.push({
        url,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  await writeReport(runDir, report, braveResponses);
  report.reportPath = path.join(runDir, 'report.json');
  report.braveResponsesPath =
    braveResponses.length > 0 ? path.join(runDir, 'brave_responses.json') : undefined;

  return report;
}
