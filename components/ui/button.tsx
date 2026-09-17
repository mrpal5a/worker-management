import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

// Comfortable on phones where a mis-tap writes wrong money; tighter once a
// pointer makes precision free.
const base =
  'inline-flex items-center justify-center rounded-md px-3 text-sm font-medium ' +
  'transition-colors disabled:opacity-50 disabled:pointer-events-none ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
  'min-h-11 sm:min-h-9';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border border-border-strong text-text-base hover:bg-surface-sunken',
  ghost: 'px-1 text-accent hover:underline',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
