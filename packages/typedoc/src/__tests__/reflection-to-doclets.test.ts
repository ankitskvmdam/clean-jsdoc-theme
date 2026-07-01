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
 *
 * @remarks
 * Uses integer multiplication; overflow is not checked.
 * @param n - input.
 * @returns the squared value.
 * @deprecated use something else
 */
export function square(n: number): number {
  return n * n;
}

/** A top-level variable. */
export const VERSION: string = '1.0.0';

/**
 * Combine two values — overloaded.
 * @param a - first string.
 * @param b - second string.
 * @returns the joined string.
 */
export function combine(a: string, b: string): string;
/**
 * @param a - first number.
 * @param b - second number.
 * @returns the sum.
 */
export function combine(a: number, b: number): number;
export function combine(a: unknown, b: unknown): unknown {
  return (a as never) + (b as never);
}

/**
 * Direction of travel.
 * @category Core/Things
 */
export enum Direction {
  /** Going up. */
  Up = 'up',
  /** Going down. */
  Down = 'down',
}

/** A coordinate pair. */
export type Point = {
  /** Horizontal component. */
  x: number;
  /** Vertical component. */
  y: number;
};

/** A data-handling callback. */
export type DataHandler = (chunk: string, index: number) => boolean;

/**
 * Identity function.
 * @typeParam T - the value type.
 */
export function identity<T>(x: T): T {
  return x;
}

/** A generic container. */
export class Box<T extends object = Record<string, unknown>> {
  /** The boxed value. */
  value?: T;
}

/** A nested namespace. */
export namespace Shapes {
  /** A circle living in the namespace. */
  export class Circle {
    /** The radius. */
    radius: number = 0;
  }

  /** A namespaced constant. */
  export const PI = 3.14;
}

/** A base class. */
export class Base {
  /** A describable label. */
  label: string = '';

  /** Describe this thing. */
  describe(): string {
    return this.label;
  }

  /**
   * Serialize this thing to JSON.
   * @returns the JSON string.
   */
  toJSON(): string {
    return JSON.stringify(this.label);
  }

  /** Reset this thing to its initial state. */
  reset(): void {
    this.label = '';
  }

  /** Clone this thing. */
  clone(): this {
    return this;
  }
}

/** Something with a name. */
export interface Named {
  /** The name of this thing. */
  name: string;
}

/**
 * A widget that extends {@link Base} and implements {@link Named}.
 */
export class Widget extends Base implements Named {
  /** {@inheritDoc Named.name} */
  name: string = '';

  /** Describe this widget (overridden). */
  override describe(): string {
    return \`Widget: \${this.label}\`;
  }

  /** @inheritDoc Base.toJSON */
  override toJSON(): string {
    return JSON.stringify(this.label);
  }

  /**
   * Widget's own prose about resetting.
   * @inheritDoc Base.reset
   */
  override reset(): void {
    this.label = '';
  }

  /** Clones it. {@inheritDoc Base.clone} */
  override clone(): this {
    return this;
  }
}
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
    // A top-level variable is its own page kind (typedoc flavor); class fields
    // stay `member`.
    expect(byLongname('VERSION')?.kind).toBe('variable');
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

describe('reflectionsToDoclets — overloads', () => {
  it('keeps the first signature on the doclet and the rest in overloads[]', () => {
    const combine = byLongname('combine')!;
    expect(combine.kind).toBe('function');
    // First (string) signature lives on the doclet itself.
    expect(combine.params?.[0]?.type?.names?.[0]).toContain('string');
    expect(combine.returns?.[0]?.type?.names?.[0]).toContain('string');
    // The implementation signature is excluded — only the second declared
    // overload (number) rides on overloads[].
    expect(combine.overloads?.length).toBe(1);
    const overload = combine.overloads![0];
    expect(overload.params?.[0]?.type?.names?.[0]).toContain('number');
    expect(overload.returns?.[0]?.type?.names?.[0]).toContain('number');
  });

  it('leaves a non-overloaded function without overloads', () => {
    expect(byLongname('square')?.overloads).toBeUndefined();
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

  it('flags an accessor with isAccessor (so setu can route it to Accessors)', () => {
    const doubled = byLongname('Foo#doubled')!;
    expect(doubled.isAccessor).toBe(true);
    // A plain field is never flagged.
    expect(byLongname('Foo#count')?.isAccessor).toBeUndefined();
  });
});

describe('reflectionsToDoclets — type parameters (generics)', () => {
  it('captures a function signature type parameter (with its @typeParam description)', () => {
    const identity = byLongname('identity')!;
    expect(identity.typeParams).toHaveLength(1);
    expect(identity.typeParams![0].name).toBe('T');
    expect(identity.typeParams![0].description).toContain('the value type');
  });

  it('captures a class type parameter with constraint + default', () => {
    const box = byLongname('Box')!;
    expect(box.typeParams).toHaveLength(1);
    const [t] = box.typeParams!;
    expect(t.name).toBe('T');
    expect(t.constraint).toBe('object');
    // The default renders as a readable type string.
    expect(t.default).toBeTruthy();
  });

  it('leaves typeParams undefined for a non-generic symbol', () => {
    expect(byLongname('square')?.typeParams).toBeUndefined();
  });
});

describe('reflectionsToDoclets — block tags', () => {
  it('@example on the class', () => {
    const foo = byLongname('Foo')!;
    expect(foo.examples?.[0]).toContain('new Foo(1)');
  });

  it('captures @remarks as a separate field (HTML)', () => {
    const square = byLongname('square')!;
    expect(square.remarks).toContain('overflow is not checked');
    // Remarks are distinct from the summary/description.
    expect(square.description ?? '').not.toContain('overflow is not checked');
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

describe('reflectionsToDoclets — enums', () => {
  it('maps Enum to kind:"enum" with isEnum:true', () => {
    const dir = byLongname('Direction')!;
    expect(dir.kind).toBe('enum');
    expect(dir.isEnum).toBe(true);
    expect(dir.scope).toBe('global');
    expect(dir.memberof).toBeUndefined();
  });

  it('maps EnumMembers to static member entries under the enum', () => {
    const up = byLongname('Direction.Up')!;
    expect(up.kind).toBe('member');
    expect(up.scope).toBe('static');
    expect(up.memberof).toBe('Direction');
    const down = byLongname('Direction.Down')!;
    expect(down.kind).toBe('member');
    expect(down.memberof).toBe('Direction');
  });

  it('carries the enum @category tag', () => {
    const dir = byLongname('Direction')!;
    expect(dir.tags?.find((t) => t.title === 'category')?.text).toBe('Core/Things');
  });
});

describe('reflectionsToDoclets — type aliases', () => {
  it('maps an object type alias to a typedef with properties', () => {
    const point = byLongname('Point')!;
    expect(point.kind).toBe('typedef');
    expect(point.type?.names).toEqual(['Object']);
    expect(point.properties?.map((p) => p.name)).toEqual(['x', 'y']);
    expect(point.properties?.[0].type?.names).toEqual(['number']);
    expect(point.properties?.[0].description).toContain('Horizontal');
  });

  it('maps a function type alias to a typedef with params/returns', () => {
    const handler = byLongname('DataHandler')!;
    expect(handler.kind).toBe('typedef');
    expect(handler.type?.names).toEqual(['function']);
    expect(handler.params?.map((p) => p.name)).toEqual(['chunk', 'index']);
    expect(handler.params?.[0].type?.names).toEqual(['string']);
    expect(handler.returns?.[0].type?.names).toEqual(['boolean']);
  });
});

describe('reflectionsToDoclets — namespaces', () => {
  it('maps a namespace to kind:"namespace" with a module: longname', () => {
    const shapes = byLongname('module:Shapes')!;
    expect(shapes.kind).toBe('namespace');
    expect(shapes.scope).toBe('global');
    expect(shapes.memberof).toBeUndefined();
  });

  it('nests a class under the namespace via module:Shapes.Circle', () => {
    const circle = byLongname('module:Shapes.Circle')!;
    expect(circle.kind).toBe('class');
    expect(circle.memberof).toBe('module:Shapes');
    expect(circle.scope).toBe('static');
  });

  it('nests an instance field under the namespaced class', () => {
    const radius = byLongname('module:Shapes.Circle#radius')!;
    expect(radius.kind).toBe('member');
    expect(radius.memberof).toBe('module:Shapes.Circle');
    expect(radius.scope).toBe('instance');
  });

  it('maps a namespaced constant to a static variable under its namespace', () => {
    const pi = byLongname('module:Shapes.PI')!;
    expect(pi.kind).toBe('variable');
    expect(pi.memberof).toBe('module:Shapes');
    expect(pi.scope).toBe('static');
  });
});

describe('adaptProject — skip diagnostics', () => {
  it('returns a doclets array and a skipped list', () => {
    const result = adaptProject(project);
    expect(Array.isArray(result.doclets)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
  });
});

describe('reflectionsToDoclets — inheritance / relationships', () => {
  it('carries extends/implements and reverse implementations', () => {
    const widget = byLongname('Widget')!;
    const named = byLongname('Named')!;
    expect(widget.augments).toContain('Base');
    expect(widget.implements).toEqual(expect.arrayContaining([expect.stringContaining('Named')]));
    expect(named.implementations).toEqual(expect.arrayContaining([expect.stringContaining('Widget')]));
  });

  it('marks overrides and inheritedFrom on members', () => {
    const describeMethod = doclets.find((d) => d.name === 'describe' && d.memberof === 'Widget')!;
    expect(describeMethod.override).toBe(true);
    expect(describeMethod.overrides).toBeTruthy();

    const label = byLongname('Widget#label')!;
    expect(label.inherited).toBe(true);
    expect(label.inherits).toBeTruthy();
  });

  it('sets implementationOf on a member that implements an interface member', () => {
    const name = byLongname('Widget#name')!;
    expect(name.implementationOf).toBeTruthy();
    expect(name.implementationOf).toContain('Named');
  });
});

/**
 * `@inheritDoc` (explicit target, block-tag form `@inheritDoc Base.toJSON`, and
 * bare form with no target) is resolved by TypeDoc's OWN converter before our
 * adapter ever sees the comment — verified via a real `app.convert()` dump
 * (see NOTES.md §5a): the member's `comment.summary`/`blockTags` are replaced
 * with the resolved target's, so `commentFields`/`summaryToHtml` pick up the
 * merged result with no bridge-side resolver needed. These assertions guard
 * that behavior against a TypeDoc upgrade silently changing it.
 */
describe('reflectionsToDoclets — @inheritDoc resolution', () => {
  it('resolves an explicit-target @inheritDoc (block-tag form) from the target comment', () => {
    const widgetToJson = doclets.find((d) => d.name === 'toJSON' && d.memberof === 'Widget')!;
    expect(widgetToJson.description).toContain('Serialize this thing to JSON');
    // The target's own @returns block tag rides along too.
    expect(widgetToJson.returns?.[0]?.description).toContain('the JSON string');
  });

  it('resolves a bare @inheritDoc (inline form, no target) from the implemented member', () => {
    const widgetName = byLongname('Widget#name')!;
    expect(widgetName.description).toContain('The name of this thing');
  });

  it('resolves an explicit-target @inheritDoc INLINE form ({@inheritDoc Target}) end-to-end', () => {
    // Mirrors the block-tag assertion above, but for the inline
    // `{@inheritDoc Base.clone}` form used inside `Widget.clone`'s prose.
    // TypeDoc resolves it to the target's summary during conversion.
    const widgetClone = doclets.find((d) => d.name === 'clone' && d.memberof === 'Widget')!;
    expect(widgetClone.description).toContain('Clone this thing');
  });

  it('CHARACTERIZES TypeDoc overwriting a member’s OWN summary with the @inheritDoc target', () => {
    // `Widget.reset` writes its own prose ("Widget's own prose about
    // resetting.") AND carries `@inheritDoc Base.reset`. TypeDoc's converter
    // OVERWRITES the member's own summary with the target's summary (it logs
    // "Content in the summary section will be overwritten by the @inheritDoc
    // tag") — it is NOT an "own-wins" / fill-only-empty merge. This test
    // intentionally pins that real overwrite behavior: the doclet description
    // is Base.reset's text, and the member's own prose is GONE. A future
    // TypeDoc upgrade or bridge change that alters this will fail loudly here.
    const widgetReset = doclets.find((d) => d.name === 'reset' && d.memberof === 'Widget')!;
    expect(widgetReset.description).toContain('Reset this thing to its initial state');
    expect(widgetReset.description).not.toContain('Widget’s own prose');
    expect(widgetReset.description).not.toContain("Widget's own prose");
  });
});

/**
 * `@order` is not a TypeDoc-native tag, so it must be declared in `blockTags`
 * for TypeDoc to keep it; the adapter then forwards it (via the unknown-tag
 * default) as `tags:[{title:'order', text}]`, which is exactly what setu's
 * `readOrder` reads to position the page in the sidebar. Isolated conversion so
 * the custom `blockTags` doesn't perturb the main suite.
 */
describe('reflectionsToDoclets — @order block tag', () => {
  let orderDoclets: TDoclet[];
  let tmp2: string;

  beforeAll(async () => {
    tmp2 = await mkdtemp(join(tmpdir(), 'cjt-typedoc-order-'));
    const entry = join(tmp2, 'index.ts');
    await writeFile(
      entry,
      `
/**
 * An ordered class.
 * @order 1
 */
export class Alpha {}

/** An unordered class. */
export class Beta {}
`,
      'utf8'
    );
    await writeFile(
      join(tmp2, 'tsconfig.json'),
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
        tsconfig: posix(join(tmp2, 'tsconfig.json')),
        skipErrorChecking: true,
        logLevel: 'Error',
        // Declare @order so TypeDoc keeps it (mirrors the typedoc example's config).
        blockTags: ['@order'],
      },
      []
    );
    const converted = await app.convert();
    if (!converted) throw new Error('typedoc convert() returned undefined');
    orderDoclets = reflectionsToDoclets(converted);
  }, 60_000);

  afterAll(async () => {
    if (tmp2) await rm(tmp2, { recursive: true, force: true });
  });

  it('forwards @order as tags:[{title:"order", text}] (setu reads it as the sort key)', () => {
    const alpha = orderDoclets.find((d) => d.longname === 'Alpha');
    expect(alpha?.tags?.find((t) => t.title === 'order')?.text).toBe('1');
  });

  it('leaves a class with no @order without an order tag', () => {
    const beta = orderDoclets.find((d) => d.longname === 'Beta');
    expect(beta?.tags?.find((t) => t.title === 'order')).toBeUndefined();
  });
});

describe('reflectionsToDoclets — async detection', () => {
  let asyncDoclets: TDoclet[];
  let tmp3: string;

  beforeAll(async () => {
    tmp3 = await mkdtemp(join(tmpdir(), 'cjt-typedoc-async-'));
    const entry = join(tmp3, 'index.ts');
    await writeFile(
      entry,
      `
/** A store with an async loader. */
export class Store {
  /** Load the data. */
  async load(): Promise<string> {
    return 'data';
  }

  /** A synchronous getter. */
  get(): string {
    return 'data';
  }

  /** Returns a promise but is not declared async — still should be detected. */
  fetchViaPromise(): Promise<number> {
    return Promise.resolve(1);
  }
}
`,
      'utf8'
    );
    await writeFile(
      join(tmp3, 'tsconfig.json'),
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
        tsconfig: posix(join(tmp3, 'tsconfig.json')),
        skipErrorChecking: true,
        logLevel: 'Error',
      },
      []
    );
    const converted = await app.convert();
    if (!converted) throw new Error('typedoc convert() returned undefined');
    asyncDoclets = reflectionsToDoclets(converted);
  }, 60_000);

  afterAll(async () => {
    if (tmp3) await rm(tmp3, { recursive: true, force: true });
  });

  it('sets async on an async method', () => {
    const load = asyncDoclets.find((d) => d.longname === 'Store#load');
    expect(load?.async).toBe(true);
  });

  it('sets async on a non-async method that returns a Promise', () => {
    const fetchViaPromise = asyncDoclets.find((d) => d.longname === 'Store#fetchViaPromise');
    expect(fetchViaPromise?.async).toBe(true);
  });

  it('does not set async on a synchronous method', () => {
    const get = asyncDoclets.find((d) => d.longname === 'Store#get');
    expect(get?.async).toBeUndefined();
  });
});
