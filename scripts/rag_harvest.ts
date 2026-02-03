#!/usr/bin/env node
/**
 * RAG Harvest CLI: pnpm rag:harvest --agent sleep_insomnia --limit 20
 *                 pnpm rag:harvest --all --limit 20
 *                 pnpm rag:harvest --agent anxiety_panic --limit 5 --dry-run
 */
import 'dotenv/config';
import { runHarvestForAgent } from '../src/lib/rag/harvest/run';
import { getHarvestConfig, getHarvestConfigAgentSlugs } from '../src/lib/rag/harvest/config';
import { createServiceRoleClient } from '../src/utils/supabase/admin';

function parseArgs(): { agents: string[]; all: boolean; limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  const agents: string[] = [];
  let all = false;
  let limit = 20;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent' && args[i + 1]) {
      agents.push(args[++i]);
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      const n = parseInt(args[++i], 10);
      if (!Number.isNaN(n) && n > 0) limit = n;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { agents, all, limit, dryRun };
}

async function getAgentSlugsForAll(): Promise<string[]> {
  const configSlugs = getHarvestConfigAgentSlugs();
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from('agent_profiles').select('id');
    if (error || !data?.length) {
      return configSlugs;
    }
    const dbIds = new Set(data.map((r: { id: string }) => r.id));
    return configSlugs.filter((slug) => dbIds.has(slug));
  } catch {
    return configSlugs;
  }
}

async function main(): Promise<void> {
  const { agents, all, limit, dryRun } = parseArgs();

  let slugs: string[];
  if (agents.length > 0) {
    for (const a of agents) {
      if (!getHarvestConfig(a)) {
        console.error(`No harvest config for agent: ${a}`);
        process.exit(1);
      }
    }
    slugs = agents;
    console.log(`Harvesting ${slugs.length} agent(s): ${slugs.join(', ')}`);
  } else if (all) {
    slugs = await getAgentSlugsForAll();
    if (slugs.length === 0) {
      console.error('No agents with harvest config found.');
      process.exit(1);
    }
    console.log(`Harvesting ${slugs.length} agent(s): ${slugs.join(', ')}`);
  } else {
    console.error('Usage: pnpm rag:harvest --agent <slug> [--agent <slug> ...] | --all [--limit N] [--dry-run]');
    process.exit(1);
  }

  const maxSearchRequests =
    parseInt(process.env.HARVEST_MAX_SEARCH_REQUESTS ?? '', 10) || 500;
  let remainingRequests = maxSearchRequests;

  for (const slug of slugs) {
    console.log(`\n--- ${slug} (limit=${limit}, dryRun=${dryRun}) ---`);
    const report = await runHarvestForAgent({
      agentSlug: slug,
      limit,
      dryRun,
      maxSearchRequests: remainingRequests,
    });
    remainingRequests -= report.searchRequestsUsed;
    console.log(
      `  urls_found=${report.urlsFound} ingested=${report.urlsIngested} skipped_dup=${report.skippedDuplicates} failed=${report.failed.length} search_requests=${report.searchRequestsUsed}`
    );
    if (report.failed.length > 0) {
      report.failed.slice(0, 5).forEach((f) => console.log(`  failed: ${f.url} - ${f.reason}`));
      if (report.failed.length > 5) {
        console.log(`  ... and ${report.failed.length - 5} more`);
      }
    }
    if (report.reportPath) {
      console.log(`  report: ${report.reportPath}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
