import { AttendanceRow } from './attendance-row';
import { SearchScope } from '@/components/ui/search';
import type { DayFraction } from '@/app/actions/attendance';

export interface AttendanceListWorker {
  id: string;
  name: string;
  phone: string | null;
  companyId: string | null;
  ot: string;
  dayFraction: DayFraction;
  /** The entry's rate snapshot if marked, else the worker's current day rate. */
  payRate: string;
}

interface Props {
  dateKey: string;
  workers: AttendanceListWorker[];
  companies: { id: string; name: string }[];
}

const searchTextOf = (w: AttendanceListWorker) => `${w.name} ${w.phone ?? ''}`;

/** The worker list plus a search box that narrows it by name or phone. */
export function AttendanceList({ dateKey, workers, companies }: Props) {
  return (
    <SearchScope
      haystacks={workers.map(searchTextOf)}
      placeholder="Search workers by name or phone…"
      noun="workers"
    >
      {/* Column headings only make sense once the row is a grid. */}
      <div className="hidden border-b border-border-base pb-2 text-sm font-medium text-text-muted sm:grid sm:grid-cols-[1fr_2fr_7.5rem_5rem_6rem] sm:gap-3">
        <div>Worker</div>
        <div>Company</div>
        <div>Day</div>
        <div>OT hrs</div>
        <div className="text-right">Pay</div>
      </div>
      <ul>
        {workers.map((w) => (
          <AttendanceRow
            key={w.id}
            searchText={searchTextOf(w)}
            dateKey={dateKey}
            workerId={w.id}
            workerName={w.name}
            companies={companies}
            initialCompanyId={w.companyId}
            initialOt={w.ot}
            initialDayFraction={w.dayFraction}
            payRate={w.payRate}
          />
        ))}
      </ul>
    </SearchScope>
  );
}
