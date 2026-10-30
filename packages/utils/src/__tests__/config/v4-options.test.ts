import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateThemeOpts } from '../../config/validate-opts';
import { V4_OPTION_MAP, v4OptionHint, MIGRATION_GUIDE_URL } from '../../config/v4-options';
import { THEME_OPT_KEYS } from '../../config/opts-schema';
import type { Diagnostic } from '../../config/diagnostics';

/** The JSDoc bridge's call shape: shared flat namespace + v4 checks on. */
const jsdocValidate = (opts: Record<string, unknown>, strict = false) =>
  validateThemeOpts({
    opts,
    unknownKeyPolicy: 'suggest-typos',
    knownNonThemeKeys: new Set(['destination', 'template']),
    checkV4Options: true,
    strict,
  });

const byPath = (list: readonly Diagnostic[], path: string): Diagnostic | undefined =>
  list.find((d) => d.path === path);

describe('V4_OPTION_MAP', () => {
  it('matches v4ToV5 in the repo-root migration-map.json (the source of truth)', () => {
    const mapPath = fileURLToPath(new URL('../../../../../migration-map.json', import.meta.url));
    const { v4ToV5 } = JSON.parse(readFileSync(mapPath, 'utf8')) as {
      v4ToV5: Record<string, { v5: string | null; status: string }>;
    };
    const fromJson = Object.fromEntries(
      Object.entries(v4ToV5).map(([key, { v5, status }]) => [key, { v5, status }])
    );
    expect(V4_OPTION_MAP).toEqual(fromJson);
  });

  it('maps every surviving v4 option onto a real v5 key', () => {
    const v5Keys = new Set<string>(THEME_OPT_KEYS);
    for (const { v5 } of Object.values(V4_OPTION_MAP)) {
      if (v5 !== null) expect(v5Keys.has(v5)).toBe(true);
    }
  });
});

describe('v4OptionHint', () => {
  it('names the replacement for a renamed option', () => {
    expect(v4OptionHint('base_url')).toBe('renamed in v5 — use `basePath`.');
  });

  it('says a removed option is gone, with what replaces the behavior', () => {
    expect(v4OptionHint('search')).toBe('removed in v5 (search is always on) — delete it.');
    expect(v4OptionHint('sort')).toBe('removed in v5 — delete it.');
  });

  it('adds a short note for a changed option', () => {
    expect(v4OptionHint('title')).toContain('use `siteName` in v5');
    expect(v4OptionHint('shouldRemoveScrollbarStyle')).toContain('scrollbar: "native"');
  });

  it('returns undefined for keys that were never v4 options', () => {
    expect(v4OptionHint('siteName')).toBeUndefined();
    expect(v4OptionHint('toString')).toBeUndefined();
  });
});

describe('validateThemeOpts — leftover v4 options', () => {
  it('warns on a theme_opts block and on each key inside it', async () => {
    const { diagnostics } = await jsdocValidate({
      theme_opts: { default_theme: 'dark', homepageTitle: 'x', base_url: '/', favicon: 'f.ico' },
    });
    const block = byPath(diagnostics.list, 'theme_opts');
    expect(block?.level).toBe('warning');
    expect(block?.code).toBe('opts/v4-theme-opts');
    expect(block?.hint).toContain(MIGRATION_GUIDE_URL);
    expect(byPath(diagnostics.list, 'theme_opts.default_theme')?.hint).toContain('removed in v5');
    expect(byPath(diagnostics.list, 'theme_opts.base_url')?.hint).toContain('`basePath`');
    expect(byPath(diagnostics.list, 'theme_opts.favicon')?.hint).toBe(
      'move it up to `opts.favicon`.'
    );
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('warns on top-level v4 option names that are not v5 keys', async () => {
    const { diagnostics } = await jsdocValidate({ homepageTitle: 'y', base_url: '/docs/' });
    expect(byPath(diagnostics.list, 'homepageTitle')).toMatchObject({
      level: 'warning',
      code: 'opts/v4-option',
    });
    expect(byPath(diagnostics.list, 'base_url')?.hint).toBe('renamed in v5 — use `basePath`.');
    // One diagnostic per key — the unknown-key pass doesn't add a second.
    expect(diagnostics.list).toHaveLength(2);
  });

  it('leaves v4 keys that are still v5 keys alone', async () => {
    const { diagnostics } = await jsdocValidate({
      menu: [],
      favicon: 'f.ico',
      meta: [],
      footer: 'x',
      destination: 'out',
    });
    expect(diagnostics.list).toHaveLength(0);
  });

  it('reports them as errors in strict mode', async () => {
    const { diagnostics } = await jsdocValidate(
      { theme_opts: { default_theme: 'dark' }, homepageTitle: 'y' },
      true
    );
    expect(diagnostics.list.map((d) => d.level)).toEqual(['error', 'error', 'error']);
    expect(diagnostics.hasErrors()).toBe(true);
  });

  it('stays off unless asked for (the TypeDoc flavor never had v4 options)', async () => {
    const { diagnostics } = await validateThemeOpts({ opts: { theme_opts: {}, base_url: '/' } });
    expect(diagnostics.list).toHaveLength(0);
  });
});
