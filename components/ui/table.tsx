/** Wraps a table so IT scrolls sideways, never the page body. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="tabular w-full min-w-[32rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, right = false }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`border-b border-border-base pb-2 font-medium text-text-muted ${right ? 'text-right' : ''}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, right = false }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <td className={`border-b border-border-base py-1.5 sm:py-1 ${right ? 'text-right' : ''}`}>
      {children}
    </td>
  );
}
