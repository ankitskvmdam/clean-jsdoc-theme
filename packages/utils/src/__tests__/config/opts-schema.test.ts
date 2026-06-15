import { describe, it, expect } from 'vitest';
import { FooterSchema, THEME_OPT_KEYS } from '../../config/opts-schema';
import { validateThemeOpts } from '../../config/validate-opts';

describe('FooterSchema', () => {
  it('accepts an inline HTML string', () => {
    const parsed = FooterSchema.parse('<div class="site-footer">© 2026</div>');
    expect(parsed).toBe('<div class="site-footer">© 2026</div>');
  });

  it('accepts the `{ file }` object form', () => {
    const parsed = FooterSchema.parse({ file: './footer.html' });
    expect(parsed).toEqual({ file: './footer.html' });
  });

  it('strips unknown sub-keys of the object form (forward-compat shape)', () => {
    const parsed = FooterSchema.parse({ file: './footer.html', bogus: 1 });
    expect(parsed).toEqual({ file: './footer.html' });
  });

  it('rejects the object form without a `file`', () => {
    expect(() => FooterSchema.parse({})).toThrow();
  });

  it('rejects a non-string, non-object value', () => {
    expect(() => FooterSchema.parse(42)).toThrow();
  });
});

describe('footer in the theme-option surface', () => {
  it('is a recognized key, so the unknown-key suggester never flags it', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { footer: '<footer>hi</footer>' },
      unknownKeyPolicy: 'warn-all',
    });
    expect(diagnostics.list.find((d) => d.code === 'opts/unknown-key')).toBeUndefined();
  });

  it('is listed in THEME_OPT_KEYS', () => {
    expect(THEME_OPT_KEYS).toContain('footer');
  });
});
