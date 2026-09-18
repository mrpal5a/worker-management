'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavLink {
  href: string;
  label: string;
  icon: ReactNode;
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop horizontal link row. Client-only because active state needs the pathname. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
            isActive(pathname, href)
              ? 'bg-accent-soft text-accent-soft-text'
              : 'text-text-muted hover:bg-surface-sunken hover:text-text-base'
          }`}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  );
}

export { isActive };
