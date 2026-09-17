import { describe, it, expect } from 'vitest';
import { resolveTheme, opposite, THEME_COOKIE, THEME_MAX_AGE } from './theme';

describe('resolveTheme', () => {
  it('returns dark when the cookie says dark', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('returns light when the cookie says light', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('defaults to light when the cookie is missing', () => {
    expect(resolveTheme(undefined)).toBe('light');
    expect(resolveTheme(null)).toBe('light');
  });

  it('defaults to light for an empty value', () => {
    expect(resolveTheme('')).toBe('light');
  });

  it('defaults to light for an unrecognised value', () => {
    expect(resolveTheme('midnight')).toBe('light');
  });

  it('is case sensitive, so DARK is not dark', () => {
    expect(resolveTheme('DARK')).toBe('light');
  });

  it('never throws on hostile input', () => {
    for (const bad of ['<script>', '../../etc/passwd', '   ', 'x'.repeat(5000)]) {
      expect(resolveTheme(bad)).toBe('light');
    }
  });
});

describe('opposite', () => {
  it('flips light to dark', () => expect(opposite('light')).toBe('dark'));
  it('flips dark to light', () => expect(opposite('dark')).toBe('light'));
});

describe('constants', () => {
  it('uses a stable cookie name', () => {
    expect(THEME_COOKIE).toBe('wm_theme');
  });

  it('keeps the preference for a year', () => {
    expect(THEME_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});
