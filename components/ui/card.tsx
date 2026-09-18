export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds hover elevation for cards that act as links/buttons. */
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border-base bg-surface-raised p-4 shadow-sm ${
        interactive ? 'transition-all hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
