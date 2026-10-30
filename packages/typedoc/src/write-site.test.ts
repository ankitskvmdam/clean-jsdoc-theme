import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Application, ReflectionKind, type ProjectReflection } from 'typedoc';
import type { DocInput } from '@clean-jsdoc-theme/setu';
import { collectProjectDocuments, writeSite } from './write-site';

/**
 * A minimal project exercising `projectDocuments`: TypeDoc surfaces the
 * Markdown file as a `DocumentReflection` (`ReflectionKind.Document`) on the
 * project tree, which `collectProjectDocuments` must turn into a `DocInput`
 * for the SAME docs pipeline `cleanJsdocTheme.docs` feeds.
 */
const SOURCE = `
/** A documented function, just so the project has something besides the doc. */
export function noop(): void {}
`;

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
      projectDocuments: [posix(join(tmp, 'documents', 'guide.md'))],
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
    expect(docs).toHaveLength(1);
    const [doc] = docs;
    expect(doc.path).toBe('guide');
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

    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe('FROM OPTS');
  });
});

describe('writeSite — strict mode', () => {
  /** The app with a given `cleanJsdocTheme` block (the plugin option isn't declared here). */
  const withBlock = (block: Record<string, unknown>) => ({
    logger: app.logger,
    options: {
      getValue: (name: string) =>
        name === 'cleanJsdocTheme' ? block : app.options.getValue(name as never),
    } as unknown as Application['options'],
  });

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
});
