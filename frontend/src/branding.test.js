import { describe, it, expect } from 'vitest';
import en from './i18n/en.json';
import hi from './i18n/hi.json';
import mr from './i18n/mr.json';

/** Collects every dotted leaf key path from a nested object. */
function leafKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? leafKeys(v, path) : [path];
  });
}

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

  it('hi and mr define every nested leaf key that en defines', () => {
    const enKeys = leafKeys(en).sort();
    expect(leafKeys(hi).sort()).toEqual(enKeys);
    expect(leafKeys(mr).sort()).toEqual(enKeys);
  });

  it('landing page keys are translated, not left as English keys', () => {
    for (const locale of [hi, mr]) {
      expect(locale.land.hero.title1).not.toBe('land.hero.title1');
      expect(locale.land.faq.q1).not.toBe('land.faq.q1');
      expect(locale.footer.quickLinks).not.toBe('footer.quickLinks');
      expect(locale.header.features).toBeTruthy();
      expect(locale.common.notFound).toBeTruthy();
    }
  });
});
