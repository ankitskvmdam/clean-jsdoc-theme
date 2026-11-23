import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Application } from 'typedoc';

// The built plugin entry, as `"plugin": ["@clean-jsdoc-theme/typedoc"]` loads it.
// Turbo runs `test` after `build`, so `dist/` exists.
const PLUGIN = pathToFileURL(fileURLToPath(new URL('../../dist/index.js', import.meta.url))).href;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

const EXTRA_CSS = '.extra-from-file { color: teal; }\n';
const EXTRA_JS = 'window.__extraFromFile = true;\n';

let tmp: string;

/** Run the built plugin over the temp project with `block`; returns the out dir + log. */
async function build(
  name: string,
  block: Record<string, unknown>
): Promise<{ out: string; logged: string[] }> {
  const out = join(tmp, name);
  const logged: string[] = [];
  const app = await Application.bootstrapWithPlugins({
    entryPoints: [posix(join(tmp, 'src', 'index.ts'))],
    tsconfig: posix(join(tmp, 'tsconfig.json')),
    readme: posix(join(tmp, 'README.md')),
    plugin: [PLUGIN],
    outputs: [{ name: 'clean-jsdoc-theme', path: posix(out) }],
    cleanJsdocTheme: block,
    skipErrorChecking: true,
  } as Parameters<typeof Application.bootstrapWithPlugins>[0]);
  vi.spyOn(app.logger, 'log').mockImplementation((message) => {
    logged.push(String(message));
  });
  const project = await app.convert();
  if (!project) throw new Error('typedoc convert() returned undefined');
  await app.generateOutputs(project);
  return { out, logged };
}

const assetsOf = (out: string): string[] => readdirSync(join(out, '_assets'));

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-theme-opts-'));
  await mkdir(join(tmp, 'src'), { recursive: true });
  await writeFile(
    join(tmp, 'src', 'index.ts'),
    '/** Adds two numbers. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
    'utf8'
  );
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
      include: ['src/index.ts'],
    }),
    'utf8'
  );
  await writeFile(join(tmp, 'README.md'), '# Adder\n\nThe project readme.\n', 'utf8');
  await writeFile(join(tmp, 'extra.css'), EXTRA_CSS, 'utf8');
  await writeFile(join(tmp, 'extra.js'), EXTRA_JS, 'utf8');
});

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true, maxRetries: 3 });
});

describe('TypeDoc plugin — colors, darkColors and custom CSS/JS (#352)', () => {
  let out: string;
  let logged: string[];
  let html: string;

  beforeAll(async () => {
    ({ out, logged } = await build('dist', {
      basePath: '/docs',
      colors: { accent: 'red' },
      darkColors: { bg: 'black' },
      customCss: '.inline-css { color: plum; }',
      customJs: 'window.__inlineJs = 1;',
      customCssFile: posix(join(tmp, 'extra.css')),
      customJsFile: posix(join(tmp, 'extra.js')),
    }));
    html = readFileSync(join(out, 'index.html'), 'utf8');
  }, 120_000);

  it('accepts the options without an unsupported/unknown-option warning', () => {
    const said = logged.join('\n');
    expect(said).toContain('build complete');
    expect(said).not.toContain('opts/unsupported-in-typedoc');
    expect(said).not.toContain('unknown option');
  });

  it('layers colors and darkColors over the default palettes', () => {
    const sheets = assetsOf(out)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(out, '_assets', f), 'utf8'))
      .filter((css) => css.includes('--clean-accent:'));
    expect(sheets).toHaveLength(1);
    const css = sheets[0]!;
    const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
    const darkStart = css.indexOf('[data-theme="dark"]{');
    const dark = css.slice(darkStart, css.indexOf('}', darkStart));
    expect(root).toContain('--clean-accent:red;');
    // Untouched keys keep their defaults.
    expect(root).toContain('--clean-bg:oklch(0.9924 0.0079 106.54);');
    expect(dark).toContain('--clean-bg:black;');
    expect(dark).toContain('--clean-fg:oklch(0.6993 0 0);');
  });

  it('inlines customCss after the theme stylesheet and customJs before </body>', () => {
    const style = html.indexOf('<style>.inline-css { color: plum; }</style>');
    const sheet = html.search(/<link rel="stylesheet" href="\/docs\/_assets\/[^"]+" \/>/);
    expect(sheet).toBeGreaterThan(-1);
    expect(style).toBeGreaterThan(sheet);
    expect(html).toMatch(/<script>window\.__inlineJs = 1;<\/script><\/body>/);
  });

  it('copies the custom files to content-hashed assets linked under basePath once', () => {
    const css = html.match(
      /<link rel="stylesheet" href="\/docs\/_assets\/(extra\.[0-9a-f]{8}\.css)" \/>/
    );
    const js = html.match(/<script src="\/docs\/_assets\/(extra\.[0-9a-f]{8}\.js)"><\/script>/);
    expect(css).not.toBeNull();
    expect(js).not.toBeNull();
    expect(readFileSync(join(out, '_assets', css![1]!), 'utf8')).toBe(EXTRA_CSS);
    expect(readFileSync(join(out, '_assets', js![1]!), 'utf8')).toBe(EXTRA_JS);
    expect(html).not.toContain('/docs/docs/');
  });

  it('uses the bare file names when hashCustomAssets is false', async () => {
    const plain = await build('dist-plain', {
      customCssFile: posix(join(tmp, 'extra.css')),
      customJsFile: posix(join(tmp, 'extra.js')),
      hashCustomAssets: false,
    });
    const page = readFileSync(join(plain.out, 'index.html'), 'utf8');
    expect(page).toContain('<link rel="stylesheet" href="/_assets/extra.css" />');
    expect(page).toContain('<script src="/_assets/extra.js"></script>');
    expect(existsSync(join(plain.out, '_assets', 'extra.css'))).toBe(true);
    expect(existsSync(join(plain.out, '_assets', 'extra.js'))).toBe(true);
    expect(plain.logged.join('\n')).not.toContain('opts/unsupported-in-typedoc');
  }, 120_000);
});
