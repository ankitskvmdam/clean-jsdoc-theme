import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Application, type ProjectReflection } from 'typedoc';
import { writeSite } from '../write-site';

/**
 * The TypeDoc favicon is content-hashed like the JSDoc bridge's (#418): it is
 * written as `_assets/<name>.<sha8><ext>` and the `<link rel="icon">` points at
 * it, with `basePath` applied once.
 */
const SOURCE = `
/** A documented function, just so the project has something to render. */
export function noop(): void {}
`;

const SVG_A =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const SVG_B =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>';

let project: ProjectReflection;
let app: Application;
let tmp: string;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

const sha8 = (text: string): string =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex').slice(0, 8);

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-favicon-'));
  const entry = join(tmp, 'index.ts');
  await writeFile(entry, SOURCE, 'utf8');
  await writeFile(
    join(tmp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
      },
      include: ['index.ts'],
    }),
    'utf8'
  );
  app = await Application.bootstrap(
    {
      entryPoints: [posix(entry)],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      skipErrorChecking: true,
      logLevel: 'Error',
    },
    []
  );
  const converted = await app.convert();
  if (!converted) throw new Error('typedoc convert() returned undefined');
  project = converted;
}, 60_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

/** The app with a given `cleanJsdocTheme` block (the plugin option isn't declared here). */
const withBlock = (block: Record<string, unknown>) => ({
  logger: app.logger,
  options: {
    getValue: (name: string) =>
      name === 'cleanJsdocTheme' ? block : app.options.getValue(name as never),
  } as unknown as Application['options'],
});

/** Build a site quietly (warn/info muted). */
async function build(out: string, block: Record<string, unknown>): Promise<void> {
  const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
  const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
  try {
    await writeSite(out, project, withBlock(block));
  } finally {
    warn.mockRestore();
    info.mockRestore();
  }
}

const assets = (out: string): string[] =>
  existsSync(join(out, '_assets')) ? readdirSync(join(out, '_assets')) : [];
/** The site's HTML pages (this project has no readme, so there's no root index.html). */
const htmlPages = (out: string): string[] =>
  (readdirSync(out, { recursive: true }) as string[])
    .filter((f) => f.endsWith('.html'))
    .map((f) => readFileSync(join(out, f), 'utf8'));
/** One rendered page (the head, and so the icon link, is the same on every page). */
const pageHtml = (out: string): string => {
  const pages = htmlPages(out);
  expect(pages.length).toBeGreaterThan(0);
  return pages[0];
};

describe('writeSite — content-hashed favicon (#418)', () => {
  it('writes _assets/<name>.<sha8><ext> and links it from <link rel="icon">', async () => {
    const icon = join(tmp, 'icon.svg');
    await writeFile(icon, SVG_A, 'utf8');
    const out = join(tmp, 'out-root');
    await build(out, { favicon: icon });

    const icons = assets(out).filter((f) => /^icon\./.test(f));
    expect(icons).toHaveLength(1);
    expect(icons[0]).toMatch(/^icon\.[0-9a-f]{8}\.svg$/);
    expect(icons[0]).toBe(`icon.${sha8(SVG_A)}.svg`);
    expect(assets(out)).not.toContain('favicon.svg');
    expect(pageHtml(out)).toContain(
      `<link rel="icon" type="image/svg+xml" href="/_assets/icon.${sha8(SVG_A)}.svg" />`
    );
  }, 60_000);

  it('applies basePath exactly once to the href; the file stays at the site root', async () => {
    const icon = join(tmp, 'icon.svg');
    await writeFile(icon, SVG_A, 'utf8');
    const out = join(tmp, 'out-base');
    await build(out, { favicon: icon, basePath: '/docs' });

    const html = pageHtml(out);
    expect(html).toContain(`href="/docs/_assets/icon.${sha8(SVG_A)}.svg"`);
    expect(html).not.toContain('/docs/docs/');
    expect(existsSync(join(out, '_assets', `icon.${sha8(SVG_A)}.svg`))).toBe(true);
  }, 60_000);

  it('changes the served name when the favicon bytes change', async () => {
    const icon = join(tmp, 'icon-changing.svg');
    await writeFile(icon, SVG_A, 'utf8');
    const outA = join(tmp, 'out-bytes-a');
    await build(outA, { favicon: icon });
    await writeFile(icon, SVG_B, 'utf8');
    const outB = join(tmp, 'out-bytes-b');
    await build(outB, { favicon: icon });

    const a = assets(outA).filter((f) => f.startsWith('icon-changing.'));
    const b = assets(outB).filter((f) => f.startsWith('icon-changing.'));
    expect(a).toEqual([`icon-changing.${sha8(SVG_A)}.svg`]);
    expect(b).toEqual([`icon-changing.${sha8(SVG_B)}.svg`]);
    expect(a[0]).not.toBe(b[0]);
  }, 60_000);

  it('emits no icon link and no favicon file when none is configured', async () => {
    const out = join(tmp, 'out-none');
    await build(out, {});

    expect(pageHtml(out)).not.toContain('rel="icon"');
    expect(assets(out).some((f) => /^(favicon|icon)\./.test(f))).toBe(false);
  }, 60_000);
});
