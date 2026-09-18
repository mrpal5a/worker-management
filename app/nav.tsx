import Link from 'next/link';
import { currentSession } from '@/lib/current-user';
import { getProfile } from '@/lib/users';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './theme-toggle';
import { NavDrawer } from './nav-drawer';
import { NavLinks, type NavLink } from './nav-links';
import {
  CalendarIcon,
  PlusIcon,
  FileTextIcon,
  BarChartIcon,
  PieChartIcon,
  AwardIcon,
  ShieldIcon,
  LogOutIcon,
} from '@/components/ui/icons';
import type { Theme } from '@/lib/theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

/**
 * Signed-in navigation. Renders nothing when there is no session, so the login
 * page is not framed by an empty bar.
 */
export async function Nav({ theme }: { theme: Theme }) {
  const session = await currentSession();
  if (!session) return null;

  const profile = await getProfile(session.userId);
  const name = profile?.name || profile?.email || 'Signed in';

  const links: NavLink[] = [
    { href: '/attendance', label: 'Attendance', icon: <CalendarIcon width={16} height={16} /> },
    { href: '/add', label: 'Add', icon: <PlusIcon width={16} height={16} /> },
    { href: '/reports/worker', label: 'Worker', icon: <FileTextIcon width={16} height={16} /> },
    { href: '/reports/company', label: 'Company', icon: <BarChartIcon width={16} height={16} /> },
    { href: '/reports/summary', label: 'Summary', icon: <PieChartIcon width={16} height={16} /> },
    { href: '/insights', label: 'Insights', icon: <AwardIcon width={16} height={16} /> },
  ];
  if (session.role === 'admin') {
    links.push({ href: '/users', label: 'Users', icon: <ShieldIcon width={16} height={16} /> });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border-base bg-surface-raised/85 backdrop-blur supports-[backdrop-filter]:bg-surface-raised/70">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <NavDrawer links={links} userName={name} theme={theme} logout={logout} />

        <Link href="/" className="flex items-center gap-2">
          <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-accent-fg shadow-sm">
            W
          </span>
          <span className="font-semibold tracking-tight sm:hidden lg:inline">Worker Mgmt</span>
        </Link>

        <NavLinks links={links} />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-text-base">
              {initials(name)}
            </span>
            <span className="max-w-32 truncate text-sm text-text-muted">{name}</span>
          </span>
          <span className="hidden sm:inline">
            <ThemeToggle theme={theme} />
          </span>
          <form action={logout} className="hidden sm:block">
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-base"
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon width={16} height={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
