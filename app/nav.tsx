import Link from 'next/link';
import { currentSession } from '@/lib/current-user';
import { logout } from '@/app/actions/auth';

/**
 * Signed-in navigation. Renders nothing when there is no session, so the login
 * page is not framed by an empty nav bar.
 */
export async function Nav() {
  const session = await currentSession();
  if (!session) return null;

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
    <nav className="border-b bg-gray-50">
      {/* Scrolls sideways on a phone rather than wrapping to three lines and
          pushing the actual content below the fold. */}
      <div className="mx-auto flex max-w-4xl items-center gap-4 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="shrink-0 py-1 hover:underline">
            {label}
          </Link>
        ))}
        <form action={logout} className="ml-auto shrink-0 pl-4">
          <button className="py-1 text-gray-500 hover:underline">Log out</button>
        </form>
      </div>
    </nav>
  );
}
