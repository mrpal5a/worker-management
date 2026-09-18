import Link from 'next/link';
import { DownloadIcon } from '@/components/ui/icons';

/** Downloads the currently-filtered report as CSV — a plain link, so it needs no JS. */
export function ExportLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm font-medium text-text-base shadow-sm transition-colors hover:bg-surface-sunken"
    >
      <DownloadIcon width={14} height={14} />
      Export CSV
    </Link>
  );
}
