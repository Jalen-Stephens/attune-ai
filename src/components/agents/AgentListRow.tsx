'use client';

import Link from 'next/link';
import type { AgentProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AgentTagBadge } from './AgentTagBadge';
import { cn } from '@/lib/utils';
import { Phone, ChevronRight } from 'lucide-react';
import StartSessionButton from '@/app/agents/[agentId]/StartSessionButton';

interface AgentListRowProps {
  agent: AgentProfile;
}

export function AgentListRow({ agent }: AgentListRowProps) {
  const tags = agent.tags ?? [];
  const specialty = agent.specialtyCategory ?? 'General';

  return (
    <div className="border-b border-border/60 last:border-b-0 md:border-b-0">
      {/* Desktop: table-like row */}
      <div
        className={cn(
          'hidden md:flex items-center gap-4 py-4 px-4 -mx-4 rounded-lg',
          'transition-colors hover:bg-muted/40'
        )}
      >
        <Link
          href={`/agents/${agent.id}`}
          className="flex-1 min-w-0 flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg -m-2 p-2"
          aria-label={`View details for ${agent.name}`}
        >
          {agent.icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg" aria-hidden>
              {agent.icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{agent.name}</span>
              <span className="text-xs text-muted-foreground">{specialty}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {agent.description}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.slice(0, 5).map((tag) => (
                  <AgentTagBadge key={tag} tag={tag} />
                ))}
                {tags.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{tags.length - 5}</span>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/agents/${agent.id}`}>
              Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <StartSessionButton agentId={agent.id} compact />
        </div>
      </div>

      {/* Mobile: stacked card */}
      <div className="md:hidden rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          {agent.icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base" aria-hidden>
              {agent.icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{specialty}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <AgentTagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <StartSessionButton agentId={agent.id} compact className="w-full [&>button]:w-full" />
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={`/agents/${agent.id}`}>
              View details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
