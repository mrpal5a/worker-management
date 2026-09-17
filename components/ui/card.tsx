export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border-base bg-surface-raised p-4 ${className}`}>
      {children}
    </div>
  );
}
