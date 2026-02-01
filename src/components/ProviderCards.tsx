'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProviderCardItem {
  providerId?: string;
  name?: string;
  credentials?: string;
  specialties?: string[];
  modality?: string;
  location?: { city?: string; state?: string; zip?: string };
  distanceMiles?: number;
  nextAvailable?: string;
  bookingUrl?: string | null;
  summary?: string;
  [k: string]: unknown;
}

export interface ProviderCardsProps {
  providers: ProviderCardItem[];
  disclaimer?: string;
  className?: string;
}

function formatNextAvailable(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ProviderCards({ providers, disclaimer, className }: ProviderCardsProps) {
  if (!providers?.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-foreground">Provider options</h3>
      <ul className="space-y-2" role="list">
        {providers.map((p, i) => (
          <li
            key={p.providerId ?? i}
            className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{p.name}</span>
                {p.credentials && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.credentials}
                  </span>
                )}
              </div>
              {p.bookingUrl && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a
                    href={p.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Book with ${p.name} (external)`}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Book
                  </a>
                </Button>
              )}
            </div>
            {p.location && (p.location.city || p.location.state) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {[p.location.city, p.location.state, p.location.zip]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                {typeof p.distanceMiles === 'number' && (
                  <span> · {p.distanceMiles} mi</span>
                )}
              </div>
            )}
            {p.summary && (
              <p className="text-sm text-muted-foreground">{p.summary}</p>
            )}
            {p.nextAvailable && (
              <p className="text-xs text-muted-foreground">
                Next available: {formatNextAvailable(p.nextAvailable)}
              </p>
            )}
          </li>
        ))}
      </ul>
      {disclaimer && (
        <p className="text-xs text-muted-foreground italic">{disclaimer}</p>
      )}
    </div>
  );
}
