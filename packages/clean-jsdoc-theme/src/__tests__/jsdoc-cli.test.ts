import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Real JSDoc 4 runs, with the theme loaded the way users load it: through
// `opts.template`. Each test names the issue it guards; the fixtures are the
// reporters' own inputs, minimised.

// The package root (this file is src/__tests__/*.test.ts). Turbo runs `test`
// after `build`, so `dist/` exists here as it would in the tarball.
const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const JSDOC = createRequire(import.meta.url).resolve('jsdoc/jsdoc.js');
const posix = (p: string): string => p.split('\\').join('/');
/** `node_modules/clean-jsdoc-theme`: the v4 template path most configs still use. */
const TEMPLATE_ROOT = posix(pkgRoot).replace(/\/$/, '');

/** A 1x1 transparent PNG. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

interface Run {
  /** JSDoc's exit code. */
  status: number | null;
  /** stdout + stderr. */
  output: string;
  /** Does `out/<rel>` exist? */
  has: (rel: string) => boolean;
  /** `out/<rel>` as text. */
  read: (rel: string) => string;
  /** File names in `out/<rel>`. */
  list: (rel: string) => string[];
}

interface JSDocConf {
  plugins?: string[];
  source?: { include: string[] };
  opts?: Record<string, unknown>;
}

const dirs: string[] = [];

/** Per-test budget for a JSDoc spawn: generous, as CI runs loaded tests many times slower. */
const SPAWN_TEST_TIMEOUT = 300_000;

/** Write `files` into a fresh project, run `jsdoc -c jsdoc.json` in it. */
async function runJsdoc(files: Record<string, string | Buffer>, conf: JSDocConf): Promise<Run> {
  const dir = await mkdtemp(join(tmpdir(), 'cjt-jsdoc-cli-'));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, ...rel.split('/'));
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content);
  }
  const { opts, ...rest } = conf;
  await writeFile(
    join(dir, 'jsdoc.json'),
    JSON.stringify({
      source: { include: ['src'] },
      ...rest,
      opts: { destination: 'out', recurse: true, template: TEMPLATE_ROOT, ...opts },
    }),
    'utf8'
  );
  const r = spawnSync(process.execPath, [JSDOC, '-c', 'jsdoc.json'], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CLEAN_JSDOC_THEME_BUILD: '' },
    // spawnSync blocks the worker, so vitest's own timeout can't fire: bound it here.
    timeout: 90_000,
    killSignal: 'SIGKILL',
  });
  if (r.error) {
    throw new Error(`JSDoc did not finish: ${r.error.message}\n${r.stdout}\n${r.stderr}`);
  }
  const outPath = (rel: string): string => join(dir, 'out', ...rel.split('/'));
  return {
    status: r.status,
    output: `${r.stdout}\n${r.stderr}`,
    has: (rel) => existsSync(outPath(rel)),
    read: (rel) => readFileSync(outPath(rel), 'utf8'),
    list: (rel) => (existsSync(outPath(rel)) ? readdirSync(outPath(rel)) : []),
  };
}

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true, maxRetries: 3 })));
});

/** The props a page hands to the island called `name` (via its data-island-id). */
function islandProps(html: string, name: string): Record<string, unknown> {
  const id = new RegExp(`data-island="${name}" data-island-id="([^"]+)"`).exec(html)?.[1];
  if (!id) throw new Error(`no ${name} island on the page`);
  const payload = /<script type="application\/json" data-island-props>(.*?)<\/script>/su.exec(
    html
  )?.[1];
  if (!payload) throw new Error('no island props payload on the page');
  return (JSON.parse(payload) as Record<string, Record<string, unknown>>)[id];
}

const lines = (...l: string[]): string => l.join('\n') + '\n';

const PROJECT: Record<string, string | Buffer> = {
  // #347: the reporter's file, verbatim.
  'src/main.js': lines(
    '/**',
    ' * import these functions to your own project.',
    ' * @module foo',
    ' */',
    'export const y = () => 1'
  ),
  // #333: a class whose page slug is `index`.
  'src/index-class.js': lines(
    '/**',
    ' * A documented class literally named Index.',
    ' */',
    'export class Index {',
    '  /** Does a thing. */',
    '  run() {}',
    '}'
  ),
  // #333: dwv's two globals. An unclosed backtick, then a bare brace example.
  'src/string.js': lines(
    '/**',
    ' * Split key/value string: `key0=val00&key0=val01&key1=val10',
    ' *   will return `{key0 : [val00, val01], key1 : val1}`.',
    ' *',
    ' * @param {string} inputStr The string to split.',
    ' * @returns {object} The split string.',
    ' */',
    'export function splitKeyValueString(inputStr) {',
    '  return {};',
    '}',
    '',
    '/**',
    ' * Split an input URI:',
    " * 'root?key0=val00&key0=val01&key1=val10' returns",
    ' * { base : root, query : [ key0 : [val00, val01], key1 : val1 ] }',
    ' * Returns an empty object if the input string is not correct (null, empty...)',
    ' * or if it is not a query string (no question mark).',
    ' *',
    ' * @param {string} uri The string to split.',
    ' * @returns {object} The split string.',
    ' */',
    'export function splitUri(uri) {',
    '  return {};',
    '}'
  ),
  // PR #354: a @private typedef, and string defaults. #333: a param typed as a class.
  'src/types.js': lines(
    '/**',
    ' * A secret shape.',
    ' * @private',
    ' * @typedef {object} SecretShape',
    ' * @property {string} token The token.',
    ' */',
    '',
    '/**',
    ' * A public shape.',
    ' * @typedef {object} PublicShape',
    ' * @property {string} id The id.',
    ' */',
    '',
    '/**',
    ' * Greets.',
    ' * @param {string} [name=""] Who to greet.',
    " * @param {string} [sep=''] Separator.",
    ' * @param {Index} [index] Where to look the name up.',
    ' * @returns {string} The greeting.',
    ' */',
    "export function greet(name = '', sep = '', index) {",
    '  return name + sep;',
    '}'
  ),
  // #360: inline HTML with no Markdown form in a module description.
  'src/chem.js': lines(
    '/**',
    ' * Water is H<sub>2</sub>O and E = mc<sup>2</sup>.',
    ' * @module chem',
    ' */',
    'export const water = 1;'
  ),
  // #360: escaped markup in a <summary> stays text.
  'src/chem-details.js': lines(
    '/**',
    ' * Details.',
    ' *',
    ' * <details><summary>Generic Array&lt;T&gt; &lt;script&gt;alert(2)&lt;/script&gt;' +
      ' &lt;img src="x" onerror="alert(2)" /&gt; &lt;a href="javascript:alert(2)"&gt;c&lt;/a&gt;' +
      '</summary>body</details>',
    ' * @module chemdetails',
    ' */',
    'export const details = 1;'
  ),
  // #333: a tutorial image outside the tutorials directory.
  'tutorials/io.md': lines('# IO', '', '![classes-io](../img/classes-io.png)'),
  'img/classes-io.png': PNG_1X1,
  'README.md': lines('# Home', '', 'Welcome to the fixture home page.'),
  'custom.css': '.fixture-custom{color:red}\n',
  'custom.js': 'window.__fixtureCustom = true;\n',
};

describe('JSDoc CLI end to end: reported bugs stay fixed', () => {
  let run: Run;

  beforeAll(async () => {
    run = await runJsdoc(PROJECT, {
      plugins: ['plugins/markdown'],
      source: { include: ['src', 'README.md'] },
      opts: {
        tutorials: 'tutorials',
        customCssFile: ['./custom.css'],
        customJsFile: ['./custom.js'],
        customCss: '.inline-custom{color:blue}',
        // #285: the reporter's order, v4 label "Global" included. "Tutorials"
        // keeps the tutorial reachable; "Modules" is left out on purpose.
        sectionOrder: ['Global', 'Classes', 'Tutorials'],
      },
    });
  }, SPAWN_TEST_TIMEOUT);

  it('builds with exit 0 and skips no page', () => {
    expect(run.output).not.toContain('failed to render');
    expect(run.status, run.output).toBe(0);
  });

  it('loads from `template: node_modules/clean-jsdoc-theme`, the package root (PR #356)', () => {
    expect(run.output).not.toContain('Unable to load template');
    expect(run.has('index.html')).toBe(true);
  });

  it('renders a module whose description starts with lowercase "import" (#347)', () => {
    expect(run.output).not.toContain('Could not parse import/exports with acorn');
    expect(run.has('module/foo/index.html')).toBe(true);
    expect(run.read('module/foo/index.html')).toContain(
      'import these functions to your own project.</p>'
    );
  });

  it('keeps the home page when a class is named Index (#333)', () => {
    expect(run.read('index.html')).toContain('Welcome to the fixture home page.');
    const classPage = run.read('index/index.html');
    expect(classPage).toContain('<title>Index');
    expect(classPage).not.toContain('Welcome to the fixture home page.');
  });

  it('renders the Globals page despite an unclosed backtick next to a brace example (#333)', () => {
    expect(run.output).not.toContain('Could not parse expression with acorn');
    expect(run.has('global/index.html')).toBe(true);
    const html = run.read('global/index.html');
    expect(html).toContain('id="splitkeyvaluestring"');
    expect(html).toContain('{ base : root, query :');
  });

  it('links a parameter type to the class it names (#333)', () => {
    expect(run.read('global/index.md')).toContain('- `index` ([Index](/index/), optional)');
    expect(run.read('global/index.html')).toMatch(/<a href="\/index\/"[^>]*>Index<\/a>/);
  });

  it('links the class named Index to its page, not the home page (#333)', () => {
    // `/index` is served as the home page's index.html by hosts like GitHub Pages.
    const sidebar = islandProps(run.read('index.html'), 'sidebar') as {
      nav: Array<{ label: string; slug?: string }>;
    };
    expect(sidebar.nav.find((n) => n.label === 'Index')?.slug).toBe('index');
    const home = run.read('index.html');
    expect(home).toContain('href="/index/"');
    expect(home).not.toContain('href="/index"');
  });

  it('copies a tutorial image from outside the tutorials directory and rewrites its src (#333)', () => {
    const html = run.read('tutorials/io/index.html');
    const src = /<img src="(\/_assets\/classes-io\.[0-9a-f]{8}\.png)"/.exec(html)?.[1];
    expect(src).toBeDefined();
    expect(run.has(src!.slice(1))).toBe(true);
  });

  it('gives a @private typedef no page, nav entry, mention or search record (PR #354)', () => {
    expect(run.has('secretshape/index.html')).toBe(false);
    expect(run.has('publicshape/index.html')).toBe(true);
    for (const page of [
      'index.html',
      'global/index.html',
      'global/index.md',
      'source/index.html',
    ]) {
      expect(run.read(page)).not.toContain('SecretShape');
    }
    const searchIndex = run.list('_assets').find((f) => f.startsWith('search-index.'))!;
    expect(run.read(`_assets/${searchIndex}`)).not.toContain('SecretShape');
  });

  it('shows a "" parameter default as written (PR #354)', () => {
    const md = run.read('global/index.md');
    expect(md).toContain('- `name` (string, optional, default: `""`)');
    expect(md).toContain("- `sep` (string, optional, default: `''`)");
    const html = run.read('global/index.html');
    expect(html).toMatch(/default: <code[^>]*>&quot;&quot;<\/code>/);
    expect(html).not.toContain('\\&quot;');
  });

  it('prints no announcement or promotion while generating (#332)', () => {
    expect(run.output).not.toMatch(/working on v5|discussions\/\d+|sponsor|star us|feedback/i);
  });

  it('loads custom CSS after the theme stylesheet (#299)', () => {
    const html = run.read('index.html');
    const theme = html.search(/<link rel="stylesheet" href="\/_assets\/styles\.[^"]+\.css"/);
    const file = html.search(/<link rel="stylesheet" href="\/_assets\/custom\.[0-9a-f]{8}\.css"/);
    const inline = html.indexOf('<style>.inline-custom{color:blue}</style>');
    expect(theme).toBeGreaterThanOrEqual(0);
    expect(file).toBeGreaterThan(theme);
    expect(inline).toBeGreaterThan(file);
    expect(inline).toBeLessThan(html.indexOf('</head>'));
  });

  it('runs custom JS last, after every script the theme emits (#299)', () => {
    const html = run.read('index.html');
    const custom = html.search(/<script src="\/_assets\/custom\.[0-9a-f]{8}\.js"><\/script>/);
    expect(custom).toBeGreaterThan(html.lastIndexOf('<script type="module">'));
    expect(html.indexOf('<script', custom + 1)).toBe(-1);
  });

  it('orders the sidebar sections as sectionOrder says, and hides the rest (#285)', () => {
    const { nav } = islandProps(run.read('index.html'), 'sidebar') as {
      nav: Array<{ label: string; group?: string }>;
    };
    const groups = [...new Set(nav.map((n) => n.group).filter(Boolean))];
    expect(groups).toEqual(['Globals', 'Classes', 'Tutorials']);
    expect(nav.map((n) => n.label)).not.toContain('foo');
  });

  it('tells the mobile drawer which page is current, as it tells the sidebar (#303)', () => {
    const html = run.read('global/index.html');
    const mobile = islandProps(html, 'mobile-nav');
    const desktop = islandProps(html, 'sidebar');
    expect(mobile.currentSlug).toBe('global');
    expect(mobile.currentSlug).toBe(desktop.currentSlug);
    expect(mobile.nav).toEqual(desktop.nav);
  });

  it('keeps <sub> and <sup> in prose, and joins their text in the meta description (#360)', () => {
    const html = run.read('module/chem/index.html');
    expect(html).toContain('H<sub>2</sub>O');
    expect(html).toContain('mc<sup>2</sup>');
    expect(html).toContain('content="Water is H2O and E = mc2."');
    expect(run.read('module/chem/index.md')).toContain('H<sub>2</sub>O');
  });

  it('keeps escaped markup in a <details> summary as text (#360)', () => {
    const html = run.read('module/chemdetails/index.html');
    expect(html).toContain('<details><summary>Generic Array&lt;T> &lt;script>alert(2)&lt;/script>');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toMatch(/<img[^>]*onerror/);
    expect(html).not.toContain('href="javascript:');
  });
});

describe('JSDoc CLI end to end: configuration problems (PR #356)', () => {
  const MIN = { 'src/a.js': '/** A thing. */\nexport const a = 1;\n' };

  it(
    'without plugins/markdown: exits 1, says what to add, writes nothing',
    async () => {
      const run = await runJsdoc(MIN, {});
      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain('"plugins": ["plugins/markdown"]');
      expect(run.output).not.toContain('Unhandled rejection');
      expect(run.has('global/index.html')).toBe(false);
    },
    SPAWN_TEST_TIMEOUT
  );

  describe('leftover v4 options, theme loaded from `template: node_modules/clean-jsdoc-theme/dist`', () => {
    let run: Run;

    // One spawn serves both checks: the dist template path and the v4 warnings.
    beforeAll(async () => {
      run = await runJsdoc(MIN, {
        plugins: ['plugins/markdown'],
        opts: {
          template: `${TEMPLATE_ROOT}/dist`,
          theme_opts: { default_theme: 'dark', sections: ['Global', 'Classes'] },
          title: 'Old title',
          search: true,
        },
      });
    }, SPAWN_TEST_TIMEOUT);

    it('`template: node_modules/clean-jsdoc-theme/dist` keeps working', () => {
      expect(run.output).not.toContain('Unable to load template');
      expect(run.status, run.output).toBe(0);
      expect(run.has('global/index.html')).toBe(true);
    });

    it('leftover v4 options: builds, and warns about each one with a hint', () => {
      expect(run.status, run.output).toBe(0);
      expect(run.has('global/index.html')).toBe(true);
      expect(run.output).toContain('(theme_opts) [opts/v4-theme-opts]');
      expect(run.output).toContain('(theme_opts.default_theme) [opts/v4-option]');
      expect(run.output).toContain('(theme_opts.sections) [opts/v4-option]');
      expect(run.output).toContain('use `sectionOrder` in v5');
      expect(run.output).toContain('(title) [opts/v4-name]');
      expect(run.output).toContain('use `siteName` in v5');
      expect(run.output).toContain('(search) [opts/v4-name]');
    });
  });

  it(
    'strict + a leftover theme_opts block: exits 1 and writes nothing',
    async () => {
      const run = await runJsdoc(MIN, {
        plugins: ['plugins/markdown'],
        opts: { strict: true, theme_opts: { default_theme: 'dark' } },
      });
      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain('theme_opts');
      expect(run.has('global/index.html')).toBe(false);
    },
    SPAWN_TEST_TIMEOUT
  );
});
