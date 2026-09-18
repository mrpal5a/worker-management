import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/current-user';
import { getProfile } from '@/lib/users';
import { listWorkers, listCompanies, entriesForDate, loadMonth } from '@/lib/repo';
import { aggregate } from '@/lib/reports';
import { toDateKey } from '@/lib/date';
import { money, currentMonth, monthLabel } from '@/lib/format';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import {
  CalendarIcon,
  UsersIcon,
  BriefcaseIcon,
  FileTextIcon,
  BarChartIcon,
  PieChartIcon,
  ShieldIcon,
  ClockIcon,
  CreditCardIcon,
  TrendingUpIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function Home() {
  const session = await currentSession();
  if (!session) redirect('/login');

  const profile = await getProfile(session.userId);
  const firstName = (profile?.name || profile?.email || 'there').split(' ')[0];

  const todayKey = toDateKey(new Date());
  const todayLabel = new Date(`${todayKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const { year, month } = currentMonth();

  const [workers, companies, entries, monthRows] = await Promise.all([
    listWorkers(),
    listCompanies(),
    entriesForDate(todayKey),
    loadMonth(year, month),
  ]);

  const agg = aggregate(monthRows);

  const sections: { href: string; label: string; description: string; icon: React.ReactNode }[] = [
    { href: '/attendance', label: 'Attendance', description: 'Mark today’s attendance and OT', icon: <CalendarIcon /> },
    { href: '/workers', label: 'Workers', description: 'Register and day rates', icon: <UsersIcon /> },
    { href: '/companies', label: 'Companies', description: 'Register and bill rates', icon: <BriefcaseIcon /> },
    { href: '/reports/worker', label: 'Worker Report', description: 'One worker, one month', icon: <FileTextIcon /> },
    { href: '/reports/company', label: 'Company Report', description: 'One company, one month', icon: <BarChartIcon /> },
    { href: '/reports/summary', label: 'Summary', description: 'Every payout and receivable', icon: <PieChartIcon /> },
  ];
  if (session.role === 'admin') {
    sections.push({ href: '/users', label: 'Users', description: 'Manage accounts', icon: <ShieldIcon /> });
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="dot-grid -mx-4 mb-6 rounded-2xl px-4 py-8 sm:-mx-6 sm:px-8">
        <p className="text-sm font-medium text-accent">{todayLabel}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(new Date().getUTCHours())}, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-text-muted">Here&rsquo;s where things stand today.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ClockIcon width={16} height={16} />}
          label="Present today"
          value={`${entries.length} / ${workers.length}`}
          hint={companies.length === 0 ? 'No companies yet' : undefined}
        />
        <StatCard
          icon={<CreditCardIcon width={16} height={16} />}
          label="To pay this month"
          value={money(agg.totals.pay)}
          hint={monthLabel(year, month)}
        />
        <StatCard
          icon={<BarChartIcon width={16} height={16} />}
          label="To collect this month"
          value={money(agg.totals.bill)}
          hint={monthLabel(year, month)}
        />
        <StatCard
          icon={<TrendingUpIcon width={16} height={16} />}
          label="Margin this month"
          value={money(agg.totals.margin)}
          hint={monthLabel(year, month)}
        />
      </div>

      <h2 className="mb-3 text-sm font-medium text-text-muted">Go to</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card interactive className="flex h-full items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text">
                {s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.label}</div>
                <div className="truncate text-sm text-text-muted">{s.description}</div>
              </div>
              <ArrowRightIcon width={16} height={16} className="shrink-0 text-text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
