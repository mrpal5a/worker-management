'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { THEME_COOKIE, THEME_MAX_AGE } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

export async function setTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  // Not httpOnly: this carries no security meaning, it is only a rendering
  // preference, and there is no reason to hide it from the client.
  jar.set(THEME_COOKIE, theme === 'dark' ? 'dark' : 'light', {
    sameSite: 'lax',
    maxAge: THEME_MAX_AGE,
    path: '/',
  });
  // Re-render the layout so <html class> matches the new choice.
  revalidatePath('/', 'layout');
}
