'use client';

import { createContext, useContext, useState } from 'react';
import { Input } from './input';
import { SearchIcon } from './icons';
import Decimal from 'decimal.js';
import { Td, Tr } from './table';
import { money, hours } from '@/lib/format';
import { matchesQuery } from '@/lib/search';

/**
 * Client-side search for a list the server already rendered.
 *
 * `SearchScope` owns the query and draws the search box; rows inside it ask
 * `useSearchMatch` whether they match and hide themselves if not. Rows hide
 * rather than unmount so any in-progress edit state survives a search.
 */

interface SearchState {
  match: (text: string) => boolean;
  /** True while the box holds a non-blank query. */
  active: boolean;
}

const SearchContext = createContext<SearchState>({ match: () => true, active: false });

/** True when the row whose searchable text is `text` matches the current query. */
export function useSearchMatch(text: string): boolean {
  return useContext(SearchContext).match(text);
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
    <SearchContext.Provider value={{ match: (text) => matchesQuery(query, text), active }}>
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

/** One table row's contribution to a `SearchTfoot`. Strings, not Decimals: these cross the server→client boundary. */
export interface TotalsRow {
  text: string;
  /** Days this row counts for — 0.5 for a half day. */
  days: number;
  ot: string;
  amount: string;
}

/** What a footer cell shows: a row count, a day total, OT hours, money, or nothing. */
export type TotalsCell = 'count' | 'days' | 'ot' | 'amount' | 'blank';

/**
 * A table footer whose totals cover only the rows the search leaves visible,
 * so the bottom line always matches what is on screen.
 */
export function SearchTfoot({
  rows,
  cells,
  noun,
}: {
  rows: TotalsRow[];
  cells: TotalsCell[];
  /** Label after the number in the `count` or `days` cell, singular and plural. */
  noun: { one: string; many: string };
}) {
  const { match, active } = useContext(SearchContext);
  const shown = rows.filter((r) => match(r.text));
  const days = shown.reduce((a, r) => a + r.days, 0);
  const ot = shown.reduce((a, r) => a.plus(r.ot), new Decimal(0));
  const amount = shown.reduce((a, r) => a.plus(r.amount), new Decimal(0));

  const label = (n: number) => (
    <>
      {n} {n === 1 ? noun.one : noun.many}
      {active && <span className="ml-1.5 text-xs font-normal text-text-muted">(matching search)</span>}
    </>
  );

  return (
    <tfoot>
      <tr className="font-semibold">
        {cells.map((c, i) => {
          switch (c) {
            case 'count':
              return <Td key={i}>{label(shown.length)}</Td>;
            case 'days':
              return <Td key={i}>{label(days)}</Td>;
            case 'ot':
              return <Td key={i} right>{hours(ot)}</Td>;
            case 'amount':
              return <Td key={i} right>{money(amount)}</Td>;
            default:
              return <Td key={i} />;
          }
        })}
      </tr>
    </tfoot>
  );
}
