'use client';

import type { SessionTimelineItem } from '@/lib/db';
import type { TranscriptTurn } from '@/lib/types';
import { Badge } from './ui/badge';
import { ProviderCards, type ProviderCardItem } from './ProviderCards';
import { SuggestedResources } from './SuggestedResources';
import { cn } from '@/lib/utils';
import { Clock, Stethoscope, BookOpen } from 'lucide-react';

interface SessionTimelineViewerProps {
  items: SessionTimelineItem[];
  userDisplayName?: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionTimelineViewer({
  items,
  userDisplayName,
}: SessionTimelineViewerProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No timeline available yet.</p>
      </div>
    );
  }

  const labelForRole = (role: 'user' | 'assistant') =>
    role === 'user' ? (userDisplayName?.trim() || 'user') : 'assistant';

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        if (item.type === 'transcript') {
          const turn = item.turn as TranscriptTurn;
          const isUser = turn.role === 'user';
          return (
            <div
              key={`transcript-${turn.id}`}
              className={cn(
                'flex gap-4',
                isUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'flex-1 rounded-lg border p-4 space-y-2',
                  isUser
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={isUser ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {labelForRole(turn.role)}
                  </Badge>
                  {turn.timestamp && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(turn.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{turn.text}</p>
              </div>
            </div>
          );
        }

        if (item.type === 'tool') {
          const ts = formatTime(item.timestamp);
          if (item.tool === 'findProviders') {
            const providers = (item.payload.providers ?? []) as ProviderCardItem[];
            const disclaimer = item.payload.disclaimer as string | undefined;
            if (providers.length === 0) return null;
            return (
              <div
                key={`tool-findProviders-${idx}`}
                className="flex gap-4 flex-row"
              >
                <div className="flex-1 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      <Stethoscope className="h-3 w-3 mr-1" />
                      Providers shared
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ts}
                    </span>
                  </div>
                  <ProviderCards
                    providers={providers}
                    disclaimer={disclaimer}
                  />
                </div>
              </div>
            );
          }
          if (item.tool === 'getRagResources') {
            const resources = (item.payload.resources as Record<string, unknown>[]) ?? [];
            if (resources.length === 0) return null;
            const mapped = resources.map((r, i) => ({
              id: String(r.id ?? i),
              slug: String(r.id ?? i),
              title: String(r.title ?? 'Resource'),
              snippet: String(r.snippet ?? ''),
              url: r.url ? String(r.url) : undefined,
              reason: String(r.why ?? r.reason ?? ''),
              type: String(r.type ?? 'article'),
            }));
            return (
              <div
                key={`tool-getRagResources-${idx}`}
                className="flex gap-4 flex-row"
              >
                <div className="flex-1 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      Resources shared
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ts}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Resources for you</h3>
                    <SuggestedResources resources={mapped} />
                  </div>
                </div>
              </div>
            );
          }
        }
        return null;
      })}
    </div>
  );
}
