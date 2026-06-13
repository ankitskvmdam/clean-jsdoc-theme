import { describe, it, expect } from 'vitest';
import { localeBuildPlan } from '../build-plan';

const locales = [{ code: 'en' }, { code: 'fr', name: 'Français' }, { code: 'hi' }];

/** Normalize OS path separators so assertions are platform-agnostic. */
const slash = (s: string) => s.replace(/\\/g, '/');

describe('localeBuildPlan', () => {
  it('renders the default unprefixed and others under /<locale>', () => {
    const plan = localeBuildPlan({ locales, defaultLocale: 'en', destination: 'dist' });
    expect(plan.map((p) => ({ ...p, destination: slash(p.destination) }))).toEqual([
      { code: 'en', isDefault: true, destination: 'dist', basePath: '/' },
      { code: 'fr', name: 'Français', isDefault: false, destination: 'dist/fr', basePath: '/fr' },
      { code: 'hi', isDefault: false, destination: 'dist/hi', basePath: '/hi' },
    ]);
  });

  it('nests the locale segment under a non-root base path', () => {
    const plan = localeBuildPlan({
      locales: [{ code: 'en' }, { code: 'fr' }],
      defaultLocale: 'en',
      destination: 'dist',
      basePath: '/docs',
    });
    expect(plan[0].basePath).toBe('/docs');
    expect(plan[1].basePath).toBe('/docs/fr');
  });

  it('honors a non-en default locale', () => {
    const plan = localeBuildPlan({ locales, defaultLocale: 'fr', destination: 'out' });
    const fr = plan.find((p) => p.code === 'fr')!;
    const en = plan.find((p) => p.code === 'en')!;
    expect(fr).toMatchObject({ isDefault: true, destination: 'out', basePath: '/' });
    expect(en).toMatchObject({ isDefault: false, basePath: '/en' });
    expect(slash(en.destination)).toBe('out/en');
  });
});
