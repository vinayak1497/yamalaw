import { describe, it, expect } from 'vitest';
import en from './i18n/en.json';
import hi from './i18n/hi.json';
import mr from './i18n/mr.json';

describe('YamaLaw i18n + branding', () => {
  it('has YamaLaw branding (no Nyay Setu strings)', () => {
    const all = JSON.stringify({ en, hi, mr });
    expect(all).not.toMatch(/Nyay\s?Setu/i);
    expect(en.appName).toBe('YamaLaw');
  });
  it('all locales share the same keys', () => {
    for (const k of Object.keys(en)) expect(hi[k], `hi.${k}`).toBeTruthy();
    for (const k of Object.keys(en)) expect(mr[k], `mr.${k}`).toBeTruthy();
  });
});
