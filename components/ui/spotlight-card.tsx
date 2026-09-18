import type { ReactNode } from 'react';

/** A celebratory highlight card for a single "the winner is..." figure. */
export function SpotlightCard({
  icon,
  eyebrow,
  name,
  value,
  meta,
}: {
  icon: ReactNode;
  eyebrow: string;
  name: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="brand-gradient relative overflow-hidden rounded-2xl p-5 text-accent-fg shadow-lg shadow-accent/25">
      <div className="flex items-center gap-2 text-sm font-medium text-accent-fg/80">
        {icon}
        {eyebrow}
      </div>
      <div className="mt-3 truncate text-xl font-semibold tracking-tight">{name}</div>
      <div className="tabular mt-1 text-3xl font-bold">{value}</div>
      {meta && <div className="mt-1 text-sm text-accent-fg/80">{meta}</div>}
    </div>
  );
}
