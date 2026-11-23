import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { normalizeColors, resolveCustomAssets } from '../custom-assets';

describe('normalizeColors (#352)', () => {
  it('keeps known palette keys with non-empty string values, trimming them', () => {
    expect(normalizeColors({ bg: ' oklch(0.6 0.25 0) ', accent: '#fff' })).toEqual({
      bg: 'oklch(0.6 0.25 0)',
      accent: '#fff',
    });
  });

  it('drops unknown keys and non-string / empty values', () => {
    expect(normalizeColors({ bg: 'red', nope: 'x', fg: 42, border: '  ' })).toEqual({ bg: 'red' });
  });

  it('keeps the code-chrome palette keys', () => {
    expect(
      normalizeColors({ codeHeaderBg: '#f7f7f7', codeHeaderFg: '#333', codeHighlightBg: '#eee' })
    ).toEqual({ codeHeaderBg: '#f7f7f7', codeHeaderFg: '#333', codeHighlightBg: '#eee' });
  });

  it('returns undefined for non-objects, arrays, and inputs with no usable keys', () => {
    expect(normalizeColors(undefined)).toBeUndefined();
    expect(normalizeColors('red')).toBeUndefined();
    expect(normalizeColors(['red'])).toBeUndefined();
    expect(normalizeColors({ nope: 'x' })).toBeUndefined();
    expect(normalizeColors({})).toBeUndefined();
  });
});

describe('resolveCustomAssets (#352)', () => {
  const href = (p: string): string => '/' + p;
  let dir: string;
  let warnings: string[];
  const logger = { warn: (m: string): void => void warnings.push(m) };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-typedoc-custom-'));
    await writeFile(join(dir, 'site.css'), 'body{}', 'utf8');
    await writeFile(join(dir, 'more.css'), 'a{}', 'utf8');
    await writeFile(join(dir, 'site.js'), 'console.log(1);', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('warns on (and skips) v4-style CDN objects and remote URLs', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      {
        customCssFile: [{ href: 'https://cdn.example/x.css', integrity: 'sha-1' }],
        customJsFile: 'https://code.jquery.com/jquery.js',
      },
      href,
      logger
    );
    expect(out.files).toEqual([]);
    expect(out.theme).toEqual({});
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/^\[clean-jsdoc-theme\] /);
    expect(warnings[0]).toContain('customCssFile takes local file paths');
    expect(warnings[0]).toContain('`@import url(…)` it from `customCss`');
    expect(warnings[1]).toContain("customJsFile only copies local files; skipping 'https://");
  });

  it('copies a local file to a content-hashed asset without warning', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      { customCssFile: join(dir, 'site.css'), customJsFile: join(dir, 'site.js') },
      href,
      logger
    );
    expect(warnings).toEqual([]);
    expect(out.theme.customCssLinks?.[0]).toMatch(/^\/_assets\/site\.[0-9a-f]{8}\.css$/);
    expect(out.theme.customJsLinks?.[0]).toMatch(/^\/_assets\/site\.[0-9a-f]{8}\.js$/);
    expect(out.files.map((f) => f.path)).toEqual([
      out.theme.customCssLinks?.[0]?.slice(1),
      out.theme.customJsLinks?.[0]?.slice(1),
    ]);
    expect(Buffer.from(out.files[0]!.contents).toString('utf8')).toBe('body{}');
  });

  it('uses the bare name when hashCustomAssets is false', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      { customCssFile: join(dir, 'site.css'), hashCustomAssets: false },
      href,
      logger
    );
    expect(out.theme.customCssLinks).toEqual(['/_assets/site.css']);
    expect(out.files.map((f) => f.path)).toEqual(['_assets/site.css']);
  });

  it('keeps array order and emits a repeated file once', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      {
        customCssFile: [join(dir, 'more.css'), join(dir, 'site.css'), join(dir, 'more.css')],
        hashCustomAssets: false,
      },
      href,
      logger
    );
    expect(out.theme.customCssLinks).toEqual(['/_assets/more.css', '/_assets/site.css']);
    expect(out.files).toHaveLength(2);
  });

  it('warns on (and skips) an unreadable file', async () => {
    warnings = [];
    const out = await resolveCustomAssets({ customJsFile: './no/such.js' }, href, logger);
    expect(out.files).toEqual([]);
    expect(out.theme.customJsLinks).toBeUndefined();
    expect(warnings).toEqual([
      "[clean-jsdoc-theme] could not read customJsFile ('./no/such.js'); skipping it.",
    ]);
  });

  it('prefixes the served href only, never the output path, under a sub-path', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      { customCssFile: join(dir, 'site.css'), hashCustomAssets: false },
      (p) => '/docs/' + p,
      logger
    );
    expect(out.theme.customCssLinks).toEqual(['/docs/_assets/site.css']);
    expect(out.files[0]?.path).toBe('_assets/site.css');
  });

  it('trims inline strings and drops blank ones', async () => {
    warnings = [];
    const out = await resolveCustomAssets(
      { customCss: '  body { color: red; }  ', customJs: '   ' },
      href,
      logger
    );
    expect(out.theme).toEqual({ customCss: 'body { color: red; }' });
    expect(out.files).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
