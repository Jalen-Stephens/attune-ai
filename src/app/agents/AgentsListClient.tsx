'use client';

import { useMemo, useState } from 'react';
import type { AgentProfile } from '@/lib/types';
import { AgentListRow } from '@/components/agents/AgentListRow';
import { AgentFilters, type SortOption } from '@/components/agents/AgentFilters';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentsListClientProps {
  agents: AgentProfile[];
}

export function AgentsListClient({ agents }: AgentsListClientProps) {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortOption>('recommended');

  const categories = useMemo(
    () => [...new Set(agents.map((a) => a.specialtyCategory).filter(Boolean))] as string[],
    [agents]
  );
  const allTags = useMemo(
    () => [...new Set(agents.flatMap((a) => a.tags ?? []))].sort(),
    [agents]
  );

  const filteredAndSorted = useMemo(() => {
    let list = agents;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description?.toLowerCase().includes(q)) ||
          (a.specialtyCategory?.toLowerCase().includes(q)) ||
          (a.tags?.some((t) => t.toLowerCase().includes(q)))
      );
    }
    if (specialty) {
      list = list.filter((a) => a.specialtyCategory === specialty);
    }
    if (selectedTags.size > 0) {
      list = list.filter((a) => (a.tags ?? []).some((t) => selectedTags.has(t)));
    }

    if (sort === 'a-z') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'relevant' && q) {
      const score = (agent: AgentProfile) =>
        (agent.name.toLowerCase().includes(q) ? 2 : 0) +
        (agent.tags?.some((t) => t.toLowerCase().includes(q)) ? 1 : 0) +
        (agent.description?.toLowerCase().includes(q) ? 1 : 0);
      list = [...list].sort((a, b) => score(b) - score(a));
    }

    return list;
  }, [agents, search, specialty, selectedTags, sort]);

  const clearFilters = () => {
    setSearch('');
    setSpecialty('');
    setSelectedTags(new Set());
    setSort('recommended');
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        This is not a substitute for professional care. In a crisis, please reach out to a mental health professional or emergency services.
      </p>

      <div className="space-y-4">
        <AgentFilters
          search={search}
          onSearchChange={setSearch}
          specialty={specialty}
          onSpecialtyChange={setSpecialty}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          sort={sort}
          onSortChange={setSort}
          categories={categories}
          allTags={allTags}
          resultCount={filteredAndSorted.length}
        />
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border border-dashed border-border bg-muted/30">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matches</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            No agents match your filters. Try clearing filters or different keywords.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-0">
          {filteredAndSorted.map((agent) => (
            <AgentListRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
