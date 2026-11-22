import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  collectDocs,
  createImageCollector,
  resolveDocImages,
  resolveDocletImages,
  resolveLocatedDocImages,
} from '../docs';

/** A 1x1 transparent PNG (bytes), enough to exercise the image asset pipeline. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

let dir: string;
const noop = (): void => {};

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cjt-typedoc-docs-'));
  await mkdir(join(dir, 'guides'), { recursive: true });
  await writeFile(join(dir, 'index.md'), '# Home\n\nWelcome.\n', 'utf8');
  await writeFile(
    join(dir, 'guides', 'getting-started.md'),
    '---\ntitle: Getting Started\ngroup: Guides\n---\n\n# Start\n\n![diagram](./diagram.png)\n![logo](./logo.svg)\n',
    'utf8'
  );
  await writeFile(join(dir, 'guides', 'diagram.png'), PNG_1X1);
  await writeFile(join(dir, 'guides', 'logo.svg'), SVG, 'utf8');
  // Noise that must be ignored.
  await writeFile(join(dir, 'notes.txt'), 'ignored', 'utf8');
  await mkdir(join(dir, '.hidden'), { recursive: true });
  await writeFile(join(dir, '.hidden', 'secret.md'), '# secret', 'utf8');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('collectDocs', () => {
  it('walks the tree into DocInputs with POSIX, extension-stripped slugs', async () => {
    const docs = await collectDocs(dir, noop);
    const paths = docs.map((d) => d.path);
    expect(paths).toEqual(['guides/getting-started', 'index']);
    expect(docs.every((d) => d.type === 'markdown')).toBe(true);
  });

  it('ignores non-doc files and dot-directories', async () => {
    const docs = await collectDocs(dir, noop);
    expect(docs.find((d) => d.path.includes('notes'))).toBeUndefined();
    expect(docs.find((d) => d.path.includes('secret'))).toBeUndefined();
  });

  it('records each file as a cwd-relative, forward-slash source for diagnostics', async () => {
    const docs = await collectDocs(dir, noop);
    const guide = docs.find((d) => d.path === 'guides/getting-started')!;
    expect(guide.source).toMatch(new RegExp(`(^|/)${basename(dir)}/guides/getting-started\\.md$`));
    expect(guide.source).not.toContain('\\');
  });

  it('returns [] for a missing directory (never throws)', async () => {
    expect(await collectDocs(join(dir, 'nope'), noop)).toEqual([]);
    expect(await collectDocs('', noop)).toEqual([]);
  });
});

describe('resolveDocImages', () => {
  it('copies local images to content-hashed _assets and rewrites the src', async () => {
    const docs = await collectDocs(dir, noop);
    const resolved = await resolveDocImages(docs, dir, noop);
    const guide = resolved.docs.find((d) => d.path === 'guides/getting-started')!;
    // The PNG src is rewritten to a root-relative, hashed _assets path.
    expect(guide.content).toMatch(/!\[diagram\]\(\/_assets\/diagram\.[0-9a-f]{8}\.png\)/);
    // Both assets are emitted for writing.
    expect(resolved.files.map((f) => f.path).some((p) => /_assets\/diagram\.[0-9a-f]{8}\.png/.test(p))).toBe(true);
    expect(resolved.files.map((f) => f.path).some((p) => /_assets\/logo\.[0-9a-f]{8}\.svg/.test(p))).toBe(true);
  });

  it('collects SVG markup for inlining, keyed by the rewritten src', async () => {
    const docs = await collectDocs(dir, noop);
    const resolved = await resolveDocImages(docs, dir, noop);
    const keys = Object.keys(resolved.inlineSvgs);
    expect(keys.length).toBe(1);
    expect(keys[0]).toMatch(/^\/_assets\/logo\.[0-9a-f]{8}\.svg$/);
    expect(resolved.inlineSvgs[keys[0]]).toContain('<svg');
    // A responsive sizing style is injected onto the root <svg>.
    expect(resolved.inlineSvgs[keys[0]]).toContain('max-width:100%');
  });

  it('leaves remote/data/anchor srcs untouched', async () => {
    const docs = [
      { path: 'x', type: 'markdown' as const, content: '![a](https://e.com/i.png) ![b](#frag) ![c](data:image/png;base64,AA)' },
    ];
    const resolved = await resolveDocImages(docs, dir, noop);
    expect(resolved.docs[0].content).toBe(docs[0].content);
    expect(resolved.files).toEqual([]);
  });

  it('rewrites raw HTML <img> srcs too (both quote styles), deduped', async () => {
    const docs = [
      {
        path: 'guides/x',
        type: 'html' as const,
        content: '<img src="./diagram.png" alt="a"><img src=\'./diagram.png\'>',
      },
    ];
    const resolved = await resolveDocImages(docs, dir, noop);
    expect(resolved.files).toHaveLength(1); // copied once
    const m = resolved.docs[0].content.match(/\/_assets\/diagram\.[0-9a-f]{8}\.png/g);
    expect(m).toHaveLength(2);
    expect(resolved.docs[0].content).not.toContain('./diagram.png');
  });

  it('emits a base-free root-relative src and inlineSvgs key (basePath is added downstream, #377)', async () => {
    const docs = [
      {
        path: 'guides/x',
        type: 'markdown' as const,
        content: '![d](./diagram.png)\n![l](./logo.svg)',
      },
    ];
    const resolved = await resolveDocImages(docs, dir, noop);
    expect(resolved.docs[0].content).toMatch(/!\[d\]\(\/_assets\/diagram\.[0-9a-f]{8}\.png\)/);
    const [key] = Object.keys(resolved.inlineSvgs);
    expect(key).toMatch(/^\/_assets\/logo\.[0-9a-f]{8}\.svg$/);
    expect(resolved.docs[0].content).toContain(`![l](${key})`);
  });

  it('leaves image syntax inside code spans / fenced blocks untouched (no warn)', async () => {
    const warn = vi.fn();
    const docs = [
      {
        path: 'guides/x',
        type: 'markdown' as const,
        content:
          '![real](./diagram.png)\n\n' +
          'Inline: `![alt](./diagram.png)`\n\n' +
          '```md\n![alt](./missing.png)\n```\n',
      },
    ];
    const resolved = await resolveDocImages(docs, dir, warn);
    // Only the real reference copied; the missing one in a fence was never read.
    expect(resolved.files).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
    expect(resolved.docs[0].content).toContain('`![alt](./diagram.png)`');
    expect(resolved.docs[0].content).toContain('![alt](./missing.png)');
  });
});

describe('resolveLocatedDocImages', () => {
  it('resolves each doc against its own directory and copies a shared image once', async () => {
    const collector = createImageCollector(noop);
    const docs = await resolveLocatedDocImages(
      [
        {
          doc: { path: 'a', type: 'markdown', content: '![d](./diagram.png)' },
          baseDir: join(dir, 'guides'),
        },
        {
          doc: {
            path: 'b',
            type: 'markdown',
            content: "![d](../guides/diagram.png)\n\n<div><img src='../guides/diagram.png'></div>",
          },
          baseDir: join(dir, 'notes'),
        },
      ],
      collector
    );
    expect(collector.files).toHaveLength(1);
    const srcs = docs.flatMap(
      (d) => d.content.match(/\/_assets\/diagram\.[0-9a-f]{8}\.png/g) ?? []
    );
    expect(srcs).toHaveLength(3);
    expect(new Set(srcs).size).toBe(1);
    expect(docs[1].content).not.toContain('../guides/diagram.png');
  });

  it('leaves remote/data/code-span srcs alone and warns once for a missing file', async () => {
    const warn = vi.fn();
    const content =
      '![r](https://e.com/i.png) ![b](data:image/png;base64,AA) `![c](./diagram.png)`\n\n' +
      '![m](./missing.png) <img src="./missing.png">';
    const [doc] = await resolveLocatedDocImages(
      [{ doc: { path: 'x', type: 'markdown', content }, baseDir: join(dir, 'guides') }],
      createImageCollector(warn)
    );
    expect(doc.content).toBe(content);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("could not read image './missing.png'");
  });

  it('without a baseDir, rewrites only the srcs listed in `files` (no warning for the rest)', async () => {
    const warn = vi.fn();
    const collector = createImageCollector(warn);
    const input = {
      path: 'x',
      type: 'markdown' as const,
      content: '![a](./diagram.png) ![b](./other.png)',
    };
    const [doc] = await resolveLocatedDocImages(
      [{ doc: input, files: new Map([['./diagram.png', join(dir, 'guides', 'diagram.png')]]) }],
      collector
    );
    expect(doc.content).toMatch(
      /^!\[a\]\(\/_assets\/diagram\.[0-9a-f]{8}\.png\) !\[b\]\(\.\/other\.png\)$/
    );
    expect(collector.files).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('percent-encodes a file name with a space so the src is a valid destination', async () => {
    const spaced = join(dir, 'spaced');
    await mkdir(spaced, { recursive: true });
    await writeFile(join(spaced, 'my pic.png'), PNG_1X1);
    const collector = createImageCollector(noop);
    const docs = await resolveLocatedDocImages(
      [
        // A docs-directory style raw <img> with a literal space…
        {
          doc: { path: 'a', type: 'html', content: '<img src="./my pic.png">' },
          baseDir: spaced,
        },
        // …and the packages-mode fallback, keyed by TypeDoc's `%20` src text.
        {
          doc: { path: 'b', type: 'markdown', content: '![Sp](./my%20pic.png)' },
          files: new Map([['./my%20pic.png', join(spaced, 'my pic.png')]]),
        },
      ],
      collector
    );
    expect(docs[0].content).toMatch(/^<img src="\/_assets\/my%20pic\.[0-9a-f]{8}\.png">$/);
    expect(docs[1].content).toMatch(/^!\[Sp\]\(\/_assets\/my%20pic\.[0-9a-f]{8}\.png\)$/);
    // One file, written under its real (decoded) name.
    expect(collector.files).toHaveLength(1);
    expect(collector.files[0].path).toMatch(/^_assets\/my pic\.[0-9a-f]{8}\.png$/);
    expect(decodeURIComponent(docs[1].content.slice('![Sp]('.length, -1))).toBe(
      '/' + collector.files[0].path
    );
  });

  it('returns the same doc object when nothing changed', async () => {
    const input = { path: 'x', type: 'markdown' as const, content: 'No images here.' };
    const [doc] = await resolveLocatedDocImages(
      [{ doc: input, baseDir: dir }],
      createImageCollector(noop)
    );
    expect(doc).toBe(input);
  });
});

describe('resolveDocletImages', () => {
  it('rewrites <img> in a doclet description relative to its source file, in place', async () => {
    // TypeDoc's comment pipeline has already rendered `![d](./diagram.png)` to
    // HTML; the src is relative to the symbol's own source file (meta.path).
    const doclet = {
      longname: 'Foo',
      description: '<p>Hi</p><img src="./diagram.png" alt="d">',
      params: [{ name: 'x', description: '<img src="./diagram.png" alt="p">' }],
      meta: { path: join(dir, 'guides'), filename: 'foo.ts', lineno: 1 },
    };
    const collector = createImageCollector(noop);
    await resolveDocletImages([doclet] as never, collector);
    expect(collector.files).toHaveLength(1); // description + param share the image
    expect(collector.files[0].path).toMatch(/^_assets\/diagram\.[0-9a-f]{8}\.png$/);
    expect(doclet.description).toMatch(/src="\/_assets\/diagram\.[0-9a-f]{8}\.png"/);
    expect(doclet.params[0].description).toMatch(/src="\/_assets\/diagram\.[0-9a-f]{8}\.png"/);
  });

  it('skips meta/examples and doclets without meta.path', async () => {
    const noMeta = { longname: 'Bar', description: '<img src="./diagram.png">' };
    const codeOnly = {
      longname: 'Baz',
      examples: ['<img src="./diagram.png">'],
      meta: { path: join(dir, 'guides'), filename: 'baz.ts', lineno: 1 },
    };
    const collector = createImageCollector(noop);
    await resolveDocletImages([noMeta, codeOnly] as never, collector);
    expect(collector.files).toHaveLength(0);
    expect(noMeta.description).toContain('./diagram.png'); // untouched (no meta.path)
    expect(codeOnly.examples[0]).toContain('./diagram.png'); // examples skipped
  });
});
