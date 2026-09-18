import type { ReactNode } from 'react';

/** A single metric tile for the dashboard and monthly summary. */
export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border-base bg-surface-raised p-4 shadow-sm">
      <div className="flex items-center gap-2 text-text-muted">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text">
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="tabular mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
    </div>
  );
}
