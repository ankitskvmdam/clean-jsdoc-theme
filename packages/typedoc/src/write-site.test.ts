import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Application, ReflectionKind, type ProjectReflection } from 'typedoc';
import type { DocInput } from '@clean-jsdoc-theme/setu';
import { collectProjectDocuments, locateProjectDocuments, writeSite } from './write-site';

/**
 * A minimal project exercising `projectDocuments`: TypeDoc surfaces the
 * Markdown file as a `DocumentReflection` (`ReflectionKind.Document`) on the
 * project tree, which `collectProjectDocuments` must turn into a `DocInput`
 * for the SAME docs pipeline `cleanJsdocTheme.docs` feeds.
 */
const SOURCE = `
/** A documented function, just so the project has something besides the doc. */
export function noop(): void {}

/**
 * A class carrying its own document.
 * @document ./notes/api-notes.md
 */
export class Notes {}
`;

/** A 1x1 transparent PNG (bytes), enough to exercise the image asset pipeline. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let project: ProjectReflection;
let app: Application;
let tmp: string;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-write-site-'));
  const entry = join(tmp, 'index.ts');
  await writeFile(entry, SOURCE, 'utf8');
  await mkdir(join(tmp, 'documents'), { recursive: true });
  await writeFile(
    join(tmp, 'documents', 'guide.md'),
    '# Guide\n\nManual guide page via projectDocuments.\n',
    'utf8'
  );
  // Project documents with local images (#378): resolved against each doc's own file.
  await writeFile(
    join(tmp, 'documents', 'gallery.md'),
    '# Gallery\n\n![Shot](./shot.png)\n\n<img src="./shot.png" alt="raw">\n\n![Solo](./solo.png)\n',
    'utf8'
  );
  await writeFile(join(tmp, 'documents', 'shot.png'), PNG_1X1);
  await writeFile(join(tmp, 'documents', 'solo.png'), Buffer.concat([PNG_1X1, Buffer.from([0])]));
  await mkdir(join(tmp, 'notes'), { recursive: true });
  await writeFile(
    join(tmp, 'notes', 'api-notes.md'),
    '# API notes\n\n![Up](../documents/shot.png)\n',
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
      include: ['index.ts'],
    }),
    'utf8'
  );

  app = await Application.bootstrap(
    {
      entryPoints: [posix(entry)],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      projectDocuments: [
        posix(join(tmp, 'documents', 'guide.md')),
        posix(join(tmp, 'documents', 'gallery.md')),
      ],
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

describe('collectProjectDocuments', () => {
  it('has a real Document reflection to work with (sanity)', () => {
    const documents = project.getReflectionsByKind(ReflectionKind.Document);
    expect(documents.length).toBeGreaterThan(0);
  });

  it('turns a projectDocuments Markdown file into a DocInput', () => {
    const docs = collectProjectDocuments(project);
    const doc = docs.find((d) => d.path === 'guide')!;
    expect(doc).toBeDefined();
    expect(doc.type).toBe('markdown');
    expect(doc.content).toContain('Manual guide page via projectDocuments.');
    expect(doc.content).toContain('# Guide');
  });

  it('de-dupes with opts docs winning on a colliding path', () => {
    const optsDocs: DocInput[] = [{ path: 'guide', content: 'FROM OPTS', type: 'markdown' }];
    const projectDocs = collectProjectDocuments(project);
    const byPath = new Map<string, DocInput>(optsDocs.map((d) => [d.path, d]));
    for (const d of projectDocs) if (!byPath.has(d.path)) byPath.set(d.path, d);
    const merged = [...byPath.values()];

    expect(merged).toHaveLength(projectDocs.length);
    expect(merged.find((d) => d.path === 'guide')!.content).toBe('FROM OPTS');
  });
});

/** The app with a given `cleanJsdocTheme` block (the plugin option isn't declared here). */
const withBlock = (
  block: Record<string, unknown>,
  typedocOptions: Record<string, unknown> = {}
) => ({
  logger: app.logger,
  options: {
    getValue: (name: string) =>
      name === 'cleanJsdocTheme'
        ? block
        : name in typedocOptions
          ? typedocOptions[name]
          : app.options.getValue(name as never),
  } as unknown as Application['options'],
});

describe('writeSite — strict mode', () => {
  it('fails on a validation warning (an unknown key) before writing anything', async () => {
    const out = join(tmp, 'out-strict-typo');
    const error = vi.spyOn(app.logger, 'error').mockImplementation(() => {});
    try {
      await expect(
        writeSite(out, project, withBlock({ strict: true, siteNme: 'x' }))
      ).rejects.toThrow(/validation failed in strict mode/);
      expect(existsSync(out)).toBe(false);
    } finally {
      error.mockRestore();
    }
  });

  it('fails on an option problem found after validation (unreadable favicon)', async () => {
    const out = join(tmp, 'out-strict-favicon');
    const error = vi.spyOn(app.logger, 'error').mockImplementation(() => {});
    try {
      await expect(
        writeSite(out, project, withBlock({ strict: true, favicon: './no/such/favicon.ico' }))
      ).rejects.toThrow(/1 option problem\(s\) in strict mode/);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('could not read favicon'));
      expect(existsSync(out)).toBe(false);
    } finally {
      error.mockRestore();
    }
  });

  it('does not fail on JSDoc-only keys or the documented siteUrl override', async () => {
    const out = join(tmp, 'out-strict-tolerated');
    const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
    try {
      await writeSite(
        out,
        project,
        withBlock(
          {
            strict: true,
            colors: { accent: 'red' },
            customCss: 'body{}',
            siteUrl: 'https://docs.example.com',
          },
          { hostedBaseUrl: 'https://example.com' }
        )
      );
      expect(readdirSync(out).length).toBeGreaterThan(0);
      const said = [...warn.mock.calls, ...info.mock.calls].map((c) => String(c[0])).join('\n');
      expect(said).toContain(`"colors" isn't supported by the TypeDoc flavor yet; it's ignored.`);
      expect(said).toContain('[opts/unsupported-in-typedoc]');
      expect(said).toContain('using `cleanJsdocTheme.siteUrl`');
    } finally {
      warn.mockRestore();
      info.mockRestore();
    }
  }, 60_000);

  it('logs each option warning once, at warn level (so logLevel "Warn" shows it)', async () => {
    const out = join(tmp, 'out-warn-level');
    const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
    try {
      await writeSite(out, project, withBlock({ readme: './README.md', colors: {} }));
      const warned = warn.mock.calls.map((c) => String(c[0]));
      const informed = info.mock.calls.map((c) => String(c[0]));
      // Each option diagnostic is printed exactly once, at warn level.
      const prints = warned.filter((m) => m.includes('opts/unsupported-in-typedoc'));
      expect(prints).toHaveLength(1);
      expect(prints[0]).toContain(`"readme" isn't used by the TypeDoc flavor; it's ignored.`);
      expect(prints[0]).toContain(
        `"colors" isn't supported by the TypeDoc flavor yet; it's ignored.`
      );
      expect(prints[0]).toContain('issues/352');
      expect(prints[0].match(/"readme" isn't used/g)).toHaveLength(1);
      expect(informed.some((m) => m.includes('opts/unsupported-in-typedoc'))).toBe(false);
    } finally {
      warn.mockRestore();
      info.mockRestore();
    }
  }, 60_000);

  it('fails on a hostedBaseUrl sub-path with no basePath (likely misconfigured)', async () => {
    const out = join(tmp, 'out-strict-subpath');
    const error = vi.spyOn(app.logger, 'error').mockImplementation(() => {});
    try {
      await expect(
        writeSite(
          out,
          project,
          withBlock({ strict: true }, { hostedBaseUrl: 'https://example.com/docs/' })
        )
      ).rejects.toThrow(/validation failed in strict mode/);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('site-url/path-ignored'));
      expect(existsSync(out)).toBe(false);
    } finally {
      error.mockRestore();
    }
  });
});

describe('writeSite — basePath + local images (#377)', () => {
  const SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

  beforeAll(async () => {
    // `images.md`, not `guide.md`: opts docs win over the projectDocuments `guide`.
    const docsDir = join(tmp, 'mdocs');
    await mkdir(docsDir, { recursive: true });
    await writeFile(
      join(docsDir, 'images.md'),
      '# Images\n\n![Welcome](./welcome.png)\n\nRaw tag: <img src="./logo.svg" alt="raw">\n\nSee [the guide](/guide) and `![not me](/x.png)`.\n',
      'utf8'
    );
    await writeFile(join(docsDir, 'welcome.png'), PNG_1X1);
    await writeFile(join(docsDir, 'logo.svg'), SVG, 'utf8');
  });

  const block = (basePath?: string) => ({
    docs: posix(join(tmp, 'mdocs')),
    siteUrl: 'https://x.example.com',
    llmsTxt: true,
    ...(basePath ? { basePath } : {}),
  });
  const read = (out: string, rel: string): string =>
    readFileSync(join(out, ...rel.split('/')), 'utf8');

  it('sub-path: the image src carries basePath exactly once, as do the .md and llms-full.txt; the SVG still inlines', async () => {
    const out = join(tmp, 'out-basepath-sub');
    const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
    try {
      await writeSite(out, project, withBlock(block('/docs')));
      const html = read(out, 'images/index.html');
      expect(html).toMatch(/<img src="\/docs\/_assets\/welcome\.[0-9a-f]{8}\.png"/);
      expect(html).not.toContain('/docs/docs/');
      expect(html).toContain('role="img" aria-label="raw"'); // inline SVG, keyed base-free
      expect(html).not.toMatch(/<img[^>]*logo\.[0-9a-f]{8}\.svg/);
      expect(html).toContain('href="/docs/guide"');
      const md = read(out, 'images/index.md');
      expect(md).toMatch(/!\[Welcome\]\(\/docs\/_assets\/welcome\.[0-9a-f]{8}\.png\)/);
      expect(md).toMatch(/!\[raw\]\(\/docs\/_assets\/logo\.[0-9a-f]{8}\.svg\)/);
      expect(md).toContain('[the guide](/docs/guide)');
      expect(md).toContain('`![not me](/x.png)`'); // code span untouched
      expect(md).not.toContain('/docs/docs/');
      const full = read(out, 'llms-full.txt');
      expect(full).toMatch(/!\[Welcome\]\(\/docs\/_assets\/welcome\.[0-9a-f]{8}\.png\)/);
      expect(full).not.toContain('/docs/docs/');
      // The served asset exists where the href points (relative to the site root).
      const assets = readdirSync(join(out, '_assets'));
      expect(assets.some((f) => /^welcome\.[0-9a-f]{8}\.png$/.test(f))).toBe(true);
    } finally {
      warn.mockRestore();
      info.mockRestore();
    }
  }, 60_000);

  it('root (control): the same outputs are base-free', async () => {
    const out = join(tmp, 'out-basepath-root');
    const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
    try {
      await writeSite(out, project, withBlock(block()));
      const html = read(out, 'images/index.html');
      expect(html).toMatch(/<img src="\/_assets\/welcome\.[0-9a-f]{8}\.png"/);
      expect(html).toContain('role="img" aria-label="raw"');
      const md = read(out, 'images/index.md');
      expect(md).toMatch(/!\[Welcome\]\(\/_assets\/welcome\.[0-9a-f]{8}\.png\)/);
      expect(md).toContain('[the guide](/guide)');
      expect(read(out, 'llms-full.txt')).toMatch(/\(\/_assets\/welcome\.[0-9a-f]{8}\.png\)/);
    } finally {
      warn.mockRestore();
      info.mockRestore();
    }
  }, 60_000);
});

describe('writeSite — projectDocuments local images (#378)', () => {
  const read = (out: string, rel: string): string =>
    readFileSync(join(out, ...rel.split('/')), 'utf8');
  const shots = (out: string): string[] =>
    readdirSync(join(out, '_assets')).filter((f) => /^shot\.[0-9a-f]{8}\.png$/.test(f));
  /** Run `writeSite` with warn/info silenced; returns what was warned. */
  const build = async (out: string, block: Record<string, unknown>): Promise<string[]> => {
    const warn = vi.spyOn(app.logger, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(app.logger, 'info').mockImplementation(() => {});
    try {
      await writeSite(out, project, withBlock(block));
      return warn.mock.calls.map((c) => String(c[0]));
    } finally {
      warn.mockRestore();
      info.mockRestore();
    }
  };

  it('root: copies the images next to each document into _assets and rewrites both forms', async () => {
    const out = join(tmp, 'out-pdocs-root');
    const warned = await build(out, {});
    const html = read(out, 'gallery/index.html');
    const srcs = [...html.matchAll(/<img src="(\/_assets\/shot\.[0-9a-f]{8}\.png)"/g)].map(
      (m) => m[1]
    );
    expect(srcs).toHaveLength(2); // Markdown image + raw <img>
    expect(new Set(srcs).size).toBe(1);
    expect(html).not.toContain('./shot.png');
    expect(existsSync(join(out, ...srcs[0].slice(1).split('/')))).toBe(true);
    expect(shots(out)).toHaveLength(1);
    // The `@document` page resolves `../documents/shot.png` from its own file → same asset.
    expect(read(out, 'api-notes/index.html')).toContain(`<img src="${srcs[0]}"`);
    expect(read(out, 'gallery/index.md')).toContain(`![Shot](${srcs[0]})`);
    expect(warned.some((m) => m.includes('could not read image'))).toBe(false);
  }, 60_000);

  it('sub-path: the src carries basePath exactly once, in the HTML, the .md and llms-full.txt', async () => {
    const out = join(tmp, 'out-pdocs-sub');
    await build(out, { basePath: '/docs', siteUrl: 'https://x.example.com', llmsTxt: true });
    const html = read(out, 'gallery/index.html');
    const m = html.match(/<img src="\/docs(\/_assets\/shot\.[0-9a-f]{8}\.png)"/);
    expect(m).not.toBeNull();
    expect(html).not.toContain('/docs/docs/');
    expect(existsSync(join(out, ...m![1].slice(1).split('/')))).toBe(true);
    const md = read(out, 'gallery/index.md');
    expect(md).toContain(`![Shot](/docs${m![1]})`);
    expect(md).not.toContain('/docs/docs/');
    const full = read(out, 'llms-full.txt');
    expect(full).toContain(`![Shot](/docs${m![1]})`);
    expect(full).not.toContain('/docs/docs/');
  }, 60_000);

  it('a project document that loses a path collision to the docs directory copies no assets', async () => {
    const docsDir = join(tmp, 'collide-docs');
    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, 'gallery.md'), '# Gallery\n\nPlain opts page.\n', 'utf8');
    const out = join(tmp, 'out-pdocs-collide');
    const warned = await build(out, { docs: posix(docsDir) });
    expect(read(out, 'gallery/index.html')).toContain('Plain opts page.');
    const assets = readdirSync(join(out, '_assets'));
    expect(assets.some((f) => /^solo\./.test(f))).toBe(false);
    expect(shots(out)).toHaveLength(1); // still used by the @document page
    expect(warned.some((m) => m.includes('could not read image'))).toBe(false);
  }, 60_000);
});

describe('locateProjectDocuments', () => {
  it('locates each document at its own source file', () => {
    const located = locateProjectDocuments(project);
    const gallery = located.find((d) => d.doc.path === 'gallery')!;
    expect(gallery.baseDir).toBe(join(tmp, 'documents'));
    const notes = located.find((d) => d.doc.path === 'api-notes')!;
    expect(notes.baseDir).toBe(join(tmp, 'notes'));
  });

  it('falls back to the relative-link targets when the source file is unknown (packages mode)', () => {
    const abs = join(tmp, 'documents', 'shot.png');
    const doc = {
      name: 'pkgdoc',
      content: [
        { kind: 'text', text: '# Pkg\n\n![P](' },
        { kind: 'relative-link', text: './pic.png', target: 7 },
        { kind: 'text', text: ') and [a page](' },
        { kind: 'relative-link', text: './other.md', target: 8 },
        { kind: 'text', text: ')' },
      ],
    };
    const stub = {
      getReflectionsByKind: () => [doc],
      files: {
        getReflectionPath: () => undefined,
        resolve: (id: number) => (id === 7 ? abs : id === 8 ? { name: 'other' } : undefined),
      },
    } as unknown as ProjectReflection;
    const [located] = locateProjectDocuments(stub);
    expect(located.baseDir).toBeUndefined();
    expect(located.files?.get('./pic.png')).toBe(abs);
    expect(located.files?.has('./other.md')).toBe(false);
    expect(located.doc.content).toContain('![P](./pic.png)');
  });
});
