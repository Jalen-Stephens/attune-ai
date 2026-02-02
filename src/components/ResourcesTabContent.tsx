'use client';

import type { SessionResource } from '@/lib/db';
import { ProviderCards, type ProviderCardItem } from './ProviderCards';
import { SuggestedResources } from './SuggestedResources';
import { Stethoscope, BookOpen } from 'lucide-react';

interface ResourcesTabContentProps {
  items: SessionResource[];
}

export default function ResourcesTabContent({ items }: ResourcesTabContentProps) {
  const providers = items.filter((i) => i.kind === 'provider');
  const resources = items.filter((i) => i.kind === 'resource');

  return (
    <div className="space-y-6">
      {providers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Stethoscope className="h-4 w-4" />
            Providers
          </h3>
          <div className="space-y-4">
            {providers.map((sr) => {
              const payload = sr.payload as { providers?: ProviderCardItem[]; disclaimer?: string };
              const providerList = (payload?.providers ?? []) as ProviderCardItem[];
              if (providerList.length === 0) return null;
              return (
                <ProviderCards
                  key={sr.id}
                  providers={providerList}
                  disclaimer={payload.disclaimer}
                />
              );
            })}
          </div>
        </section>
      )}
      {resources.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4" />
            Articles & Resources
          </h3>
          <div className="space-y-4">
            {resources.map((sr) => {
              const payload = sr.payload as { resources?: Record<string, unknown>[] };
              const resourceList = payload?.resources ?? [];
              if (resourceList.length === 0) return null;
              const mapped = resourceList.map((r, i) => ({
                id: String(r.id ?? i),
                slug: String(r.id ?? i),
                title: String(r.title ?? 'Resource'),
                snippet: String(r.snippet ?? ''),
                url: r.url ? String(r.url) : undefined,
                reason: String(r.why ?? r.reason ?? ''),
                type: String(r.type ?? 'article'),
              }));
              return <SuggestedResources key={sr.id} resources={mapped} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
