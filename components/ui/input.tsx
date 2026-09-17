import type { InputHTMLAttributes } from 'react';

/** Shared by Input and Select so the two never drift apart. */
export const fieldClasses =
  'w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text-base ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 ' +
  'disabled:bg-surface-sunken disabled:text-text-muted ' +
  'min-h-9 sm:min-h-8';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}
