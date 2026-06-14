/**
 * Per-root island seeding. Each island hydrates as its own Preact root and does
 * NOT inherit a page-level provider — so a localized island must be wrapped in
 * its own `LanguageProvider`, seeded from the (future) locale payload. These
 * tests prove the mechanism: the same component renders default English with no
 * provider (the byte-identical path) and the active locale's strings when its
 * root is wrapped — exactly what dwar's loader will do per island in Phase 3.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { LanguageProvider, createI18n } from '@clean-jsdoc-theme/bhasha';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageNav } from '../components/PageNav';

describe('per-root LanguageProvider seeding', () => {
  it('an unwrapped island renders default English', () => {
    const html = render(<ThemeToggle />);
    expect(html).toContain('Switch to dark theme');
    expect(html).toContain('Toggle theme');
  });

  it('a wrapped island root renders the active locale (+ interpolation)', () => {
    const fr = createI18n({
      locale: 'fr',
      messages: {
        'chrome.theme.switchTo': 'Passer au thème {mode}',
        'chrome.theme.toggleTitle': 'Basculer le thème',
      },
    });
    const html = render(
      <LanguageProvider value={fr}>
        <ThemeToggle />
      </LanguageProvider>
    );
    expect(html).toContain('Passer au thème dark');
    expect(html).toContain('Basculer le thème');
    expect(html).not.toContain('Switch to dark theme');
  });

  it('falls back to English for keys the active locale lacks', () => {
    // `fr` only translates one pager key; the other falls back to English.
    const fr = createI18n({ locale: 'fr', messages: { 'chrome.pager.previous': 'Précédent' } });
    const html = render(
      <LanguageProvider value={fr}>
        <PageNav prev={{ slug: 'a', title: 'A' }} next={{ slug: 'b', title: 'B' }} />
      </LanguageProvider>
    );
    expect(html).toContain('Précédent');
    expect(html).toContain('Next'); // EN fallback
  });
});
