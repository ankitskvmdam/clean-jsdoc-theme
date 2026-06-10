import { describe, it, expect } from 'vitest';
import { buildGoogleFontsLinks } from '../html';
import { buildThemeVariableCss } from '../css';
import type { ThemeTokens } from '@clean-jsdoc-theme/utils';

const baseTokens: ThemeTokens = {
  colors: {
    bg: '#fff',
    bgMuted: '#eee',
    fg: '#000',
    fgMuted: '#666',
    accent: '#00f',
    accentFg: '#fff',
    border: '#ccc',
  },
  fonts: { heading: 'Fraunces', body: 'Spline Sans', mono: 'Spline Sans Mono' },
  shiki: { light: 'github-light', dark: 'github-dark' },
};

describe('buildGoogleFontsLinks', () => {
  it('requests heading, body, and a Google mono family', () => {
    const html = buildGoogleFontsLinks(baseTokens.fonts);
    expect(html).toContain('family=Fraunces:wght@400;500;600;700');
    expect(html).toContain('family=Spline+Sans:wght@400;500;600;700');
    expect(html).toContain('family=Spline+Sans+Mono:wght@400;500;600;700');
  });

  it('does not request a mono value that is a system stack', () => {
    const html = buildGoogleFontsLinks({
      heading: 'Fraunces',
      body: 'Spline Sans',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    expect(html).not.toContain('monospace');
    expect(html).not.toContain('SFMono');
    // heading + body are still requested.
    expect(html).toContain('family=Fraunces');
    expect(html).toContain('family=Spline+Sans');
  });

  it('dedupes when heading === body', () => {
    const html = buildGoogleFontsLinks({ heading: 'Inter', body: 'Inter', mono: 'monospace' });
    expect(html.match(/family=Inter/g)).toHaveLength(1);
  });

  it('returns empty string when no family is loadable', () => {
    expect(buildGoogleFontsLinks({ heading: '', body: '', mono: 'monospace' })).toBe('');
  });
});

describe('buildThemeVariableCss — mono', () => {
  it('quotes a bare mono family and appends a monospace fallback', () => {
    const css = buildThemeVariableCss(baseTokens);
    expect(css).toContain(
      "--clean-font-mono:'Spline Sans Mono',ui-monospace,SFMono-Regular,Menlo,monospace;"
    );
  });

  it('leaves a full mono stack verbatim', () => {
    const css = buildThemeVariableCss({
      ...baseTokens,
      fonts: { ...baseTokens.fonts, mono: 'ui-monospace, SFMono-Regular, monospace' },
    });
    expect(css).toContain('--clean-font-mono:ui-monospace, SFMono-Regular, monospace;');
  });
});
