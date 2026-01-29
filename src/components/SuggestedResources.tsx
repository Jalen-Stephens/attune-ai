'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuggestedResourceItem {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  url?: string;
  reason: string;
  type: string;
}

export interface SuggestedResourcesProps {
  resources: SuggestedResourceItem[];
  className?: string;
}

export function SuggestedResources({ resources, className }: SuggestedResourcesProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (!resources.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-foreground">Suggested resources</h3>
      <ul className="space-y-2" role="list">
        {resources.map((resource) => (
          <li
            key={resource.id}
            className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{resource.title}</span>
                <span className="ml-2 text-xs text-muted-foreground capitalize">
                  {resource.type}
                </span>
              </div>
              {resource.url ? (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${resource.title} (external)`}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Open
                  </a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}
                  aria-expanded={expandedId === resource.id}
                  aria-label={expandedId === resource.id ? 'Collapse preview' : 'Preview'}
                  className="shrink-0"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  {expandedId === resource.id ? 'Collapse' : 'Preview'}
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{resource.snippet}</p>
            {expandedId === resource.id && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground border border-border">
                {resource.snippet}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
