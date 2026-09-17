import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Nav } from './nav';
import { resolveTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Worker Management',
  description: 'Daily labour attendance, worker payroll and company billing.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read on the server so the correct class is present in the first byte of
  // HTML. Applying the theme client-side would paint light and then correct
  // it — a visible flash on every navigation, because every page here is
  // force-dynamic.
  const jar = await cookies();
  const theme = resolveTheme(jar.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : undefined}>
      <body className="min-h-screen bg-surface text-text-base antialiased">
        <Nav theme={theme} />
        {children}
      </body>
    </html>
  );
}
