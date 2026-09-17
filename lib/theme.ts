export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'wm_theme';

/** One year. The theme is a preference, not a session. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Resolve a cookie value to a theme.
 *
 * Light is the default, and the device's prefers-color-scheme is deliberately
 * not consulted: the requirement is a light default regardless of the system
 * setting.
 *
 * Anything unrecognised resolves to light rather than throwing — a malformed
 * cookie is attacker-controllable input and must not be able to break
 * rendering.
 */
export function resolveTheme(cookieValue: string | undefined | null): Theme {
  return cookieValue === 'dark' ? 'dark' : 'light';
}

export function opposite(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
