import type { ReactNode } from 'react';
import { InboxIcon } from './icons';

/** Replaces the plain "No X yet" paragraphs repeated across every list screen. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-text-muted">
        <InboxIcon width={20} height={20} />
      </span>
      <p className="font-medium text-text-base">{title}</p>
      {description && <p className="max-w-xs text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
