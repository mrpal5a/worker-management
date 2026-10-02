import { describe, it, expect } from 'vitest';
import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesQuery('', 'Anil Singh')).toBe(true);
    expect(matchesQuery('   ', 'Anil Singh')).toBe(true);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(matchesQuery('  KUMAR ', 'Ankur Kumar')).toBe(true);
  });

  it('matches anywhere in the text, including a phone number', () => {
    expect(matchesQuery('9876', 'Bipin 98765 43210')).toBe(true);
  });

  it('rejects text that does not contain the query', () => {
    expect(matchesQuery('singh', 'Ankur Kumar')).toBe(false);
  });
});
