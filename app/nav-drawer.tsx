'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Theme } from '@/lib/theme';
import { ThemeToggle } from './theme-toggle';
import { isActive, type NavLink } from './nav-links';
import { LogOutIcon } from '@/components/ui/icons';

interface Props {
  links: NavLink[];
  userName: string;
  theme: Theme;
  logout: () => Promise<void>;
}

export function NavDrawer({ links, userName, theme, logout }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);

    // Lock background scroll while the drawer covers the page.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();
    const trigger = buttonRef.current;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-base transition-colors hover:bg-surface-sunken"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border-base bg-surface p-4 shadow-xl outline-none"
            >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-accent-fg shadow-sm">
                  W
                </span>
                <span className="truncate text-sm font-medium">{userName}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunken hover:text-text-base"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-0.5">
              {links.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors ${
                    isActive(pathname, href)
                      ? 'bg-accent-soft text-accent-soft-text'
                      : 'text-text-base hover:bg-surface-sunken'
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex items-center justify-between border-t border-border-base pt-4">
              <ThemeToggle theme={theme} />
              <form action={logout}>
                <button className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted hover:bg-surface-sunken hover:text-text-base">
                  <LogOutIcon width={16} height={16} />
                  Log out
                </button>
              </form>
            </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
