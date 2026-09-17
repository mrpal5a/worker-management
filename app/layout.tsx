import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Worker Management',
  description: 'Daily labour attendance, worker payroll and company billing.',
};

const links: [string, string][] = [
  ['/attendance', 'Attendance'],
  ['/workers', 'Workers'],
  ['/companies', 'Companies'],
  ['/reports/worker', 'Worker Report'],
  ['/reports/company', 'Company Report'],
  ['/reports/summary', 'Summary'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <nav className="border-b bg-gray-50">
          <div className="mx-auto flex max-w-4xl flex-wrap gap-x-4 gap-y-2 p-4 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:underline">
                {label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
