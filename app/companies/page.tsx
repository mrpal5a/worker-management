import { listCompanies } from '@/lib/repo';
import { toggleCompany } from '@/app/actions/registers';
import { CompanyForm } from './company-form';
import { toDecimal } from '@/lib/num';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await listCompanies(true);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Companies</h1>
      <p className="mb-6 text-sm text-gray-500">
        The bill rate is what this company is charged for one man-day.
      </p>

      <CompanyForm />

      {companies.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No companies yet. Add one above.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="py-2">Company</th>
              <th className="text-right">Bill rate</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className={`border-b ${c.active ? '' : 'opacity-40'}`}>
                <td className="py-2">{c.name}</td>
                <td className="text-right">{money(toDecimal(c.bill_rate))}</td>
                <td className="text-right">
                  <form action={toggleCompany.bind(null, c.id, !c.active)}>
                    <button className="text-blue-600 underline">
                      {c.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
