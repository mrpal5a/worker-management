import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  icon,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Small accent-coloured line above the title — a date, a status, a context tag. */
  eyebrow?: string;
  /** Right-aligned slot, typically a hero stat or a primary action. */
  action?: ReactNode;
}) {
  return (
    <div className="dot-grid -mx-4 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-6 sm:-mx-6 sm:px-8 sm:py-7">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-accent-fg shadow-md shadow-accent/20">
            {icon}
          </span>
        )}
        <div>
          {eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
