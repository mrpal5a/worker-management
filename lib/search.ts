/** Case-insensitive substring match; a blank query matches everything. */
export function matchesQuery(query: string, text: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || text.toLowerCase().includes(needle);
}
