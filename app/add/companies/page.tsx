import { listCompanies } from '@/lib/repo';
import { CompanyForm } from './company-form';
import { CompanyRow } from './company-row';
import { SubTabs } from '../sub-tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HeroStat } from '@/components/ui/hero-stat';
import { TableWrap, Th } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { BriefcaseIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await listCompanies(true);
  const activeCount = companies.filter((c) => c.active).length;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Companies"
        subtitle="A company is billed exactly what its workers are paid — no separate rate."
        icon={<BriefcaseIcon />}
        action={<HeroStat value={String(activeCount)} label="active" />}
      />

      <SubTabs active="companies" />

      <CompanyForm />

      {companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Add one above to get started." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Company</Th>
              <Th right>Status</Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <CompanyRow key={c.id} id={c.id} name={c.name} active={c.active} />
            ))}
          </tbody>
        </TableWrap>
      )}
    </main>
  );
}
