/** Right-aligned numeric highlight for a PageHeader's action slot. */
export function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <div className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
