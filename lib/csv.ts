/**
 * Minimal RFC 4180 CSV encoding — no dependency needed for a handful of
 * export endpoints. Every report export goes through this single function so
 * quoting/escaping only has to be correct in one place.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number): string => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}
