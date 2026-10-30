import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Application } from 'typedoc';
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { SiteManifest, TDoclet } from '@clean-jsdoc-theme/utils';
import { reflectionsToDoclets } from '../reflection-to-doclets';

/**
 * TypeDoc keeps members whose names are blank or empty string literals: a
 * property `' '` / enum member `' '` arrives with `name: ' '`, a property `''`
 * with `name: ''`. A blank name must get a fallback anchor (not abort the
 * build), and an empty one is dropped like any nameless doclet.
 */
const SOURCE = `
/** Odd keys. */
export interface Odd {
  /** A single space. */
  ' ': string;
  /** The empty string. */
  '': number;
  /** A normal key. */
  normal: boolean;
}

/** Odd enum. */
export enum Weird {
  /** A single space. */
  ' ' = 1,
  /** Normal. */
  Normal = 2,
}
`;

let doclets: TDoclet[];
let site: SiteManifest;
let tmp: string;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-blank-'));
  const entry = join(tmp, 'index.ts');
  await writeFile(entry, SOURCE, 'utf8');
  await writeFile(
    join(tmp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true, skipLibCheck: true },
      include: ['index.ts'],
    }),
    'utf8'
  );
  const app = await Application.bootstrap(
    {
      entryPoints: [posix(entry)],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      skipErrorChecking: true,
      logLevel: 'Error',
    },
    []
  );
  const project = await app.convert();
  if (!project) throw new Error('typedoc convert() returned undefined');
  doclets = reflectionsToDoclets(project);
  site = generateSite(salty.taffy(doclets), { flavor: 'typedoc' });
}, 60_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe('blank and empty member names (TypeDoc)', () => {
  it('really produces the blank and empty names (sanity)', () => {
    const names = doclets.map((d) => d.name);
    expect(names).toContain(' ');
    expect(names).toContain('');
  });

  it('gives a blank member the fallback anchor instead of throwing', () => {
    const odd = site.pages.find((p) => p.frontmatter.longname === 'Odd');
    const weird = site.pages.find((p) => p.frontmatter.longname === 'Weird');
    expect(odd?.body).toContain('id="member--20"');
    expect(weird?.body).toContain('id="member--20"');
    // Controls: normal members keep their plain anchors.
    expect(odd?.body).toContain('id="normal"');
    expect(weird?.body).toContain('id="normal"');
  });

  it('drops the empty-named member: no empty id anywhere', () => {
    for (const page of site.pages) expect(page.body).not.toContain('id=""');
    const odd = site.pages.find((p) => p.frontmatter.longname === 'Odd');
    expect(odd?.body).not.toContain('The empty string.');
  });
});
