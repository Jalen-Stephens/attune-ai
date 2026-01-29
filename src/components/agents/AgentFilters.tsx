'use client';

import { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export type SortOption = 'recommended' | 'a-z' | 'relevant';

interface AgentFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  specialty: string;
  onSpecialtyChange: (v: string) => void;
  selectedTags: Set<string>;
  onTagsChange: (tags: Set<string>) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  categories: string[];
  allTags: string[];
  resultCount: number;
}

export function AgentFilters({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
  selectedTags,
  onTagsChange,
  sort,
  onSortChange,
  categories,
  allTags,
  resultCount,
}: AgentFiltersProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [drawerOpen]);

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onTagsChange(next);
  };

  const clearFilters = () => {
    onSearchChange('');
    onSpecialtyChange('');
    onTagsChange(new Set());
    onSortChange('recommended');
    setDrawerOpen(false);
  };

  const hasActiveFilters = specialty !== '' || selectedTags.size > 0 || sort !== 'recommended';

  const FilterControls = () => (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Specialty</label>
        <select
          value={specialty}
          onChange={(e) => onSpecialtyChange(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Filter by specialty"
        >
          <option value="">All specialties</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.has(tag) ? 'default' : 'outline'}
              className="cursor-pointer font-normal"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Sort</label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Sort order"
        >
          <option value="recommended">Recommended</option>
          <option value="a-z">A–Z</option>
          <option value="relevant">Most relevant (when searching)</option>
        </select>
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}
    </>
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents by name or keywords…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search agents"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop: inline filters */}
          <div className="hidden lg:flex items-center gap-3 flex-wrap">
            <select
              value={specialty}
              onChange={(e) => onSpecialtyChange(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Filter by specialty"
            >
              <option value="">All specialties</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Sort order"
            >
              <option value="recommended">Recommended</option>
              <option value="a-z">A–Z</option>
              <option value="relevant">Most relevant</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {/* Mobile: Filters button → drawer */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {(selectedTags.size > 0 || specialty) && (
              <span className="ml-1.5 rounded-full bg-primary/20 text-primary px-1.5 text-xs">
                {selectedTags.size + (specialty ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
      </div>
      {/* Desktop: tag chips row (optional, can show below search) */}
      {allTags.length > 0 && (
        <div className="hidden lg:flex flex-wrap gap-1.5 mt-2">
          {allTags.slice(0, 12).map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.has(tag) ? 'default' : 'outline'}
              className="cursor-pointer font-normal text-xs"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-2">
        {resultCount} {resultCount === 1 ? 'agent' : 'agents'}
      </p>

      {/* Mobile filters drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-label="Filters"
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden max-h-[85vh] overflow-auto rounded-t-2xl border-t bg-card shadow-lg transition-transform duration-200 ease-out"
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-card">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4 pb-8">
              <FilterControls />
            </div>
          </div>
        </>
      )}
    </>
  );
}