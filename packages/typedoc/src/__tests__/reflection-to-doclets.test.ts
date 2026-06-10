import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Application, type ProjectReflection } from 'typedoc';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import { adaptProject, reflectionsToDoclets } from '../reflection-to-doclets';

/**
 * A single TS source exercising every v1 kind/scope/comment path the adapter
 * cares about. Converted once for the whole suite via a REAL `app.convert()` so
 * we assert against genuine reflections, not hand-mocks.
 */
const SOURCE = `
/**
 * A documented class.
 *
 * @category Core/Things
 * @example
 * const f = new Foo(1);
 */
export class Foo {
  /** A readonly instance field. */
  readonly count: number;

  /** A static field. */
  static kind = 'foo';

  /**
   * Build a Foo.
   * @param count - how many.
   */
  constructor(count: number) {
    this.count = count;
  }

  /**
   * An instance method linking to {@link Bar}.
   * @param label - the label.
   * @param times - optional repeat count.
   * @returns the rendered string.
   * @throws when label is empty.
   */
  render(label: string, times?: number): string {
    return label.repeat(times ?? 1);
  }

  /** A static method. */
  static make(): Foo {
    return new Foo(0);
  }

  /** A getter accessor. */
  get doubled(): number {
    return this.count * 2;
  }
}

/** An interface. */
export interface Bar {
  /** an interface method. */
  baz(x: number): void;
}

/**
 * A top-level function.
 * @param n - input.
 * @returns the squared value.
 * @deprecated use something else
 */
export function square(n: number): number {
  return n * n;
}

/** A top-level variable. */
export const VERSION: string = '1.0.0';
`;

let project: ProjectReflection;
let doclets: TDoclet[];
let tmp: string;

function byLongname(longname: string): TDoclet | undefined {
  return doclets.find((d) => d.longname === longname);
}

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-'));
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

  const app = await Application.bootstrap(
    {
      entryPoints: [posix(entry)],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      // The temp project lives outside any node_modules, so TypeDoc's TS type
      // checker can't resolve lib types — skip it; we only need the reflections.
      skipErrorChecking: true,
      // Quiet the logger during tests.
      logLevel: 'Error',
    },
    []
  );
  const converted = await app.convert();
  if (!converted) throw new Error('typedoc convert() returned undefined');
  project = converted;
  doclets = reflectionsToDoclets(project);
}, 60_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe('reflectionsToDoclets — kinds', () => {
  it('maps Class/Interface/Function/Method/Property/Variable/Accessor', () => {
    expect(byLongname('Foo')?.kind).toBe('class');
    expect(byLongname('Bar')?.kind).toBe('interface');
    expect(byLongname('square')?.kind).toBe('function');
    expect(byLongname('Foo#render')?.kind).toBe('function');
    expect(byLongname('Foo#count')?.kind).toBe('member');
    expect(byLongname('VERSION')?.kind).toBe('member');
    expect(byLongname('Foo#doubled')?.kind).toBe('member');
  });

  it('does NOT emit a Constructor doclet', () => {
    expect(doclets.find((d) => d.name === 'constructor')).toBeUndefined();
    expect(doclets.find((d) => d.longname?.includes('constructor'))).toBeUndefined();
  });
});

describe('reflectionsToDoclets — names/scope/separators', () => {
  it('top-level class: longname only, no memberof, global scope', () => {
    const foo = byLongname('Foo')!;
    expect(foo.memberof).toBeUndefined();
    expect(foo.scope).toBe('global');
  });

  it('instance method uses # and points memberof at the class', () => {
    const render = byLongname('Foo#render')!;
    expect(render.memberof).toBe('Foo');
    expect(render.scope).toBe('instance');
  });

  it('static member uses . separator and static scope', () => {
    const make = byLongname('Foo.make')!;
    expect(make.kind).toBe('function');
    expect(make.memberof).toBe('Foo');
    expect(make.scope).toBe('static');

    const kind = byLongname('Foo.kind')!;
    expect(kind.kind).toBe('member');
    expect(kind.scope).toBe('static');
  });

  it('interface method nests under the interface with #', () => {
    const baz = byLongname('Bar#baz')!;
    expect(baz.memberof).toBe('Bar');
    expect(baz.scope).toBe('instance');
  });
});

describe('reflectionsToDoclets — the no-self-reference guard', () => {
  it('never emits a doclet whose longname === memberof', () => {
    for (const d of doclets) {
      if (d.memberof !== undefined) {
        expect(d.longname).not.toBe(d.memberof);
      }
    }
  });
});

describe('reflectionsToDoclets — comments as HTML', () => {
  it('class summary lands in classdesc as HTML', () => {
    const foo = byLongname('Foo')!;
    expect(foo.classdesc).toContain('<p>');
    expect(foo.classdesc).toContain('A documented class');
    expect(foo.description).toBeUndefined();
  });

  it('method summary lands in description as HTML', () => {
    const render = byLongname('Foo#render')!;
    expect(render.description).toContain('<p>');
    expect(render.description).toContain('instance method');
  });

  it('converts {@link Bar} to a JSDoc {@link} the resolver can use', () => {
    const render = byLongname('Foo#render')!;
    // Bar resolves to longname "Bar"; label may or may not be appended.
    expect(render.description).toMatch(/\{@link Bar(\|[^}]*)?\}/);
  });
});

describe('reflectionsToDoclets — params/returns/types', () => {
  it('folds constructor params into the class doclet', () => {
    const foo = byLongname('Foo')!;
    expect(foo.params?.map((p) => p.name)).toEqual(['count']);
    expect(foo.params?.[0].type?.names).toEqual(['number']);
    expect(foo.params?.[0].description).toContain('how many');
  });

  it('maps method params with type/optional/description', () => {
    const render = byLongname('Foo#render')!;
    const params = render.params ?? [];
    expect(params.map((p) => p.name)).toEqual(['label', 'times']);
    const label = params.find((p) => p.name === 'label');
    expect(label?.type?.names).toEqual(['string']);
    expect(label?.description).toContain('the label');
    const times = params.find((p) => p.name === 'times');
    expect(times?.optional).toBe(true);
  });

  it('captures return type and description', () => {
    const render = byLongname('Foo#render')!;
    expect(render.returns?.[0].type?.names).toEqual(['string']);
    expect(render.returns?.[0].description).toContain('rendered string');
  });

  it('captures @throws as exceptions', () => {
    const render = byLongname('Foo#render')!;
    expect(render.exceptions?.[0].description).toContain('label is empty');
  });

  it('property type and member field flags', () => {
    const count = byLongname('Foo#count')!;
    expect(count.type?.names).toEqual(['number']);
    expect(count.readonly).toBe(true);
    expect(count.scope).toBe('instance');
  });

  it('accessor get-signature type → member type', () => {
    const doubled = byLongname('Foo#doubled')!;
    expect(doubled.type?.names).toEqual(['number']);
  });
});

describe('reflectionsToDoclets — block tags', () => {
  it('@example on the class', () => {
    const foo = byLongname('Foo')!;
    expect(foo.examples?.[0]).toContain('new Foo(1)');
  });

  it('@deprecated reason string', () => {
    const square = byLongname('square')!;
    expect(square.deprecated).toBe('use something else');
  });

  it('@category → tags:[{title:"category", text:"Core/Things"}]', () => {
    const foo = byLongname('Foo')!;
    const cat = foo.tags?.find((t) => t.title === 'category');
    expect(cat?.text).toBe('Core/Things');
  });
});

describe('reflectionsToDoclets — meta source coords', () => {
  it('sets meta.filename / lineno (and path resolving to the real file)', () => {
    const foo = byLongname('Foo')!;
    expect(foo.meta?.filename).toBe('index.ts');
    expect(typeof foo.meta?.lineno).toBe('number');
    expect(foo.meta?.lineno).toBeGreaterThan(0);
    expect(join(foo.meta!.path!, foo.meta!.filename!)).toContain('index.ts');
  });
});

describe('adaptProject — skip diagnostics', () => {
  it('returns a doclets array and a skipped list', () => {
    const result = adaptProject(project);
    expect(Array.isArray(result.doclets)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
  });
});
