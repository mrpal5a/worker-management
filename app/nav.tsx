import Link from 'next/link';
import { currentSession } from '@/lib/current-user';
import { getProfile } from '@/lib/users';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './theme-toggle';
import { NavDrawer } from './nav-drawer';
import type { Theme } from '@/lib/theme';

/**
 * Signed-in navigation. Renders nothing when there is no session, so the login
 * page is not framed by an empty bar.
 */
export async function Nav({ theme }: { theme: Theme }) {
  const session = await currentSession();
  if (!session) return null;

  const profile = await getProfile(session.userId);
  const name = profile?.name || profile?.email || 'Signed in';

  const links: [string, string][] = [
    ['/attendance', 'Attendance'],
    ['/workers', 'Workers'],
    ['/companies', 'Companies'],
    ['/reports/worker', 'Worker'],
    ['/reports/company', 'Company'],
    ['/reports/summary', 'Summary'],
  ];
  if (session.role === 'admin') links.push(['/users', 'Users']);

  return (
    <header className="border-b border-border-base bg-surface-raised">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <NavDrawer links={links} userName={name} theme={theme} logout={logout} />

        <span className="font-semibold tracking-tight sm:hidden">Worker Mgmt</span>

        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="text-text-muted transition-colors hover:text-text-base">
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden max-w-40 truncate text-sm text-text-muted sm:inline">{name}</span>
          <span className="hidden sm:inline">
            <ThemeToggle theme={theme} />
          </span>
          <form action={logout} className="hidden sm:block">
            <button className="text-sm text-text-muted hover:underline">Log out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
