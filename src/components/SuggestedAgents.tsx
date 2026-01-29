'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StartSessionButton from '@/app/agents/[agentId]/StartSessionButton';
import { cn } from '@/lib/utils';

export interface SuggestedAgentItem {
  slug: string;
  name: string;
  reason: string;
  tags: string[];
}

export interface SuggestedAgentsProps {
  agents: SuggestedAgentItem[];
  className?: string;
}

export function SuggestedAgents({ agents, className }: SuggestedAgentsProps) {
  if (!agents.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-foreground">Suggested agents</h3>
      <ul className="space-y-2" role="list">
        {agents.map((agent) => (
          <li
            key={agent.slug}
            className="rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{agent.name}</span>
                {agent.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{agent.reason}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/agents/${agent.slug}`}>Learn more</Link>
              </Button>
              <StartSessionButton agentId={agent.slug} compact className="shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
