import Link from 'next/link';

type Tab = 'workers' | 'companies';

/** Switches between the Workers and Companies registers under /add. */
export function SubTabs({ active }: { active: Tab }) {
  const tabs: { value: Tab; label: string; href: string }[] = [
    { value: 'workers', label: 'Workers', href: '/add/workers' },
    { value: 'companies', label: 'Companies', href: '/add/companies' },
  ];

  return (
    <div className="mb-6 inline-flex rounded-lg border border-border-base bg-surface-sunken p-0.5">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            active === t.value
              ? 'bg-surface-raised text-text-base shadow-sm'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
