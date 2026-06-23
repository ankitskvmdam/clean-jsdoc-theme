import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectDocs, resolveDocImages } from '../docs';

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
});
