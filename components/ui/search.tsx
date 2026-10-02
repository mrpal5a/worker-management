'use client';

import { createContext, useContext, useState } from 'react';
import { Input } from './input';
import { SearchIcon } from './icons';
import { Tr } from './table';
import { matchesQuery } from '@/lib/search';

/**
 * Client-side search for a list the server already rendered.
 *
 * `SearchScope` owns the query and draws the search box; rows inside it ask
 * `useSearchMatch` whether they match and hide themselves if not. Rows hide
 * rather than unmount so any in-progress edit state survives a search.
 */

const SearchContext = createContext<(text: string) => boolean>(() => true);

/** True when the row whose searchable text is `text` matches the current query. */
export function useSearchMatch(text: string): boolean {
  return useContext(SearchContext)(text);
}

export function SearchScope({
  haystacks,
  placeholder = 'Search…',
  noun = 'rows',
  children,
}: {
  /** One searchable string per row — only used to count matches. */
  haystacks: string[];
  placeholder?: string;
  /** Plural label for the match count, e.g. "workers". */
  noun?: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const active = query.trim() !== '';
  const matchCount = haystacks.filter((h) => matchesQuery(query, h)).length;

  return (
    <SearchContext.Provider value={(text) => matchesQuery(query, text)}>
      <div className="relative mb-3">
        <SearchIcon
          width={16}
          height={16}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-8"
        />
      </div>
      {active && (
        <div className="-mt-2 mb-2 text-xs text-text-muted" aria-live="polite">
          {matchCount} of {haystacks.length} {noun}
        </div>
      )}
      {children}
      {active && matchCount === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">No {noun} match “{query.trim()}”.</p>
      )}
    </SearchContext.Provider>
  );
}

/** A `Tr` that hides itself when it doesn't match — for server-rendered tables. */
export function SearchTr({ text, children }: { text: string; children: React.ReactNode }) {
  const match = useSearchMatch(text);
  return <Tr className={match ? '' : 'hidden'}>{children}</Tr>;
}
