import type { ButtonHTMLAttributes } from 'react';
import { SpinnerIcon } from './icons';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

// Comfortable on phones where a mis-tap writes wrong money; tighter once a
// pointer makes precision free.
const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold ' +
  'transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
  'min-h-11 sm:min-h-9';

const variants: Record<Variant, string> = {
  primary:
    'brand-gradient text-accent-fg shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35 hover:brightness-110 hover:-translate-y-px',
  secondary:
    'border border-border-strong bg-surface text-text-base shadow-sm hover:bg-surface-sunken hover:border-text-muted hover:-translate-y-px',
  ghost: 'px-1.5 font-medium text-accent hover:bg-accent-soft',
  danger:
    'border border-danger/30 bg-danger-soft text-danger shadow-sm hover:bg-danger hover:text-white hover:border-danger',
};

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <SpinnerIcon width={14} height={14} className="animate-spin" />}
      {children}
    </button>
  );
}
