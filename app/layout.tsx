import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { Nav } from './nav';
import { resolveTheme, THEME_COOKIE } from '@/lib/theme';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${inter.variable} ${theme === 'dark' ? 'dark' : ''}`}
      // A browser extension (e.g. a device emulator) can inject attributes
      // onto <html> after the server response but before React hydrates.
      // That's an artifact of the browser, not a real mismatch, so it's
      // suppressed here rather than for the whole tree.
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-surface text-text-base antialiased">
        <Nav theme={theme} />
        {children}
      </body>
    </html>
  );
}
