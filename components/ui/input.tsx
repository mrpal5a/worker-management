import type { InputHTMLAttributes } from 'react';

/**
 * Shared by Input and Select so the two never drift apart.
 *
 * Deliberately has no width utility: a plain unprefixed `w-full` here would
 * sit in the same unprefixed layer as a caller's own `w-auto`/`w-20`/etc, and
 * Tailwind resolves same-layer conflicts by internal rule order, not by
 * which class was written last in the JSX — so callers could not reliably
 * override it. Callers own their width; flex/grid parents that want fields
 * to stretch (mobile-stacked forms) already get that for free from
 * `align-items: stretch`.
 */
export const fieldClasses =
  'rounded-md border border-border-strong bg-surface px-2.5 text-sm text-text-base ' +
  'placeholder:text-text-muted transition-colors hover:border-text-muted ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 ' +
  'disabled:bg-surface-sunken disabled:text-text-muted disabled:hover:border-border-strong ' +
  'min-h-9 sm:min-h-8';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}
