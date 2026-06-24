/**
 * Tests for the opt-in `flavor: 'typedoc'` document model: enums, top-level
 * functions, and variables become standalone pages in their own kind-sections
 * (matching default TypeDoc), accessors get an "Accessors" section, and a
 * module page becomes a kind-grouped index of links. The default `'jsdoc'`
 * flavor must stay byte-identical — these symbols stay members, no new pages,
 * and the typedef label stays "Typedefs".
 */
import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite } from '../index';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

/**
 * A TypeDoc-bridge-shaped collection: a module containing an enum (+ a member),
 * a top-level function, a variable, and a class with a method + an accessor;
 * plus a global type alias.
 */
function tsCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'module', name: 'lib', longname: 'module:lib', scope: 'global', comment: '/** Lib. */', description: 'The library.' },
    {
      kind: 'enum',
      name: 'Direction',
      longname: 'module:lib.Direction',
      memberof: 'module:lib',
      scope: 'static',
      isEnum: true,
      comment: '/** Direction. */',
      description: 'A direction.',
    },
    {
      kind: 'member',
      name: 'Up',
      longname: 'module:lib.Direction.Up',
      memberof: 'module:lib.Direction',
      scope: 'static',
      defaultvalue: '"up"',
      comment: '/** Going up. */',
      description: 'Going up.',
    },
    {
      kind: 'function',
      name: 'greet',
      longname: 'module:lib.greet',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** Greet. */',
      description: 'Greets someone.',
      params: [{ name: 'name', type: { names: ['string'] }, description: 'Who.' }],
      returns: [{ type: { names: ['string'] }, description: 'A greeting.' }],
      typeParams: [{ name: 'T', constraint: 'string' }],
    },
    {
      kind: 'variable',
      name: 'VERSION',
      longname: 'module:lib.VERSION',
      memberof: 'module:lib',
      scope: 'static',
      type: { names: ['string'] },
      defaultvalue: '"1.0.0"',
      comment: '/** Version. */',
      description: 'The version.',
    },
    {
      kind: 'class',
      name: 'Widget',
      longname: 'module:lib.Widget',
      memberof: 'module:lib',
      scope: 'static',
      classdesc: 'A widget.',
      comment: '/** A widget. */',
    },
    {
      kind: 'function',
      name: 'render',
      longname: 'module:lib.Widget#render',
      memberof: 'module:lib.Widget',
      scope: 'instance',
      comment: '/** Render. */',
      description: 'Renders.',
    },
    {
      kind: 'member',
      name: 'size',
      longname: 'module:lib.Widget#size',
      memberof: 'module:lib.Widget',
      scope: 'instance',
      isAccessor: true,
      type: { names: ['number'] },
      comment: '/** Size. */',
      description: 'The size.',
    },
    {
      kind: 'typedef',
      name: 'Point',
      longname: 'Point',
      scope: 'global',
      type: { names: ['Object'] },
      comment: '/** A point. */',
      description: 'A coordinate.',
    },
  ]);
}

const pageByLongname = (m: ReturnType<typeof generateSite>, longname: string) =>
  m.pages.find((p) => p.frontmatter.longname === longname);

// Top-level section labels live on each leaf's `group` field (the renderer
// groups contiguous runs by it); nested subgroups are branch nodes with
// `children`. Collect both.
const navLabels = (m: ReturnType<typeof generateSite>): string[] => {
  const labels = new Set<string>();
  const walk = (nodes: typeof m.nav): void => {
    for (const n of nodes) {
      if (typeof n.group === 'string') labels.add(n.group);
      if (n.children) {
        labels.add(n.label);
        walk(n.children);
      }
    }
  };
  walk(m.nav);
  return [...labels];
};

describe('flavor: typedoc — standalone pages for enum/function/variable', () => {
  it('gives an enum, a top-level function, and a variable their own pages', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    expect(pageByLongname(m, 'module:lib.Direction')?.frontmatter.kind).toBe('enum');
    expect(pageByLongname(m, 'module:lib.greet')?.frontmatter.kind).toBe('function');
    expect(pageByLongname(m, 'module:lib.VERSION')?.frontmatter.kind).toBe('variable');
  });

  it('does NOT give a class method its own page (it stays a member)', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    expect(pageByLongname(m, 'module:lib.Widget#render')).toBeUndefined();
  });

  it('renders an enum page with an "Enumeration Members" section', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Direction')!.body;
    expect(body).toContain('Enumeration Members');
    expect(body).toContain('Up');
  });

  it('renders a function page with Type Parameters + Parameters + Returns', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.greet')!.body;
    expect(body).toContain('Type Parameters');
    expect(body).toContain('Parameters');
    expect(body).toContain('Returns');
  });
});

describe('flavor: typedoc — class sections + module index', () => {
  it('puts an accessor under an "Accessors" section and a method under "Methods"', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('## Accessors');
    expect(body).toContain('## Methods');
  });

  it('renders the module page as a kind-grouped index of links', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib')!.body;
    expect(body).toContain('## Enumerations');
    expect(body).toContain('## Functions');
    expect(body).toContain('## Variables');
    expect(body).toContain('## Classes');
    // The entries are links to the standalone pages, not inlined bodies.
    expect(body).toContain('[`Direction`](/');
    expect(body).toContain('[`greet`](/');
  });

  it('resolves module-index links to the standalone page, never a module anchor', () => {
    // Regression: a child symbol that owns a page must win over its
    // `module#member` anchor in the link registry — else the index links point
    // at anchors the (links-only) module page no longer has.
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const enumPage = pageByLongname(m, 'module:lib.Direction')!;
    const moduleBody = pageByLongname(m, 'module:lib')!.body;
    expect(moduleBody).toContain(`[\`Direction\`](/${enumPage.slug})`);
    // No `#…` member anchor on any index link.
    expect(moduleBody).not.toMatch(/\]\(\/[^)]*#[^)]*\)/);
  });

  it('keeps unlisted kind sections under typedoc even when sectionOrder omits them', () => {
    // Regression: default TypeDoc always shows every kind; a user sectionOrder
    // that lists only some kinds must not drop the rest (JSDoc still filters).
    const m = generateSite(tsCollection(), {
      flavor: 'typedoc',
      sectionOrder: ['Classes', 'Interfaces'],
    });
    const labels = navLabels(m);
    expect(labels).toContain('Functions');
    expect(labels).toContain('Variables');
    expect(labels).toContain('Enumerations');
  });

  it('orders the sidebar with TypeDoc kind labels', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const labels = navLabels(m);
    expect(labels).toContain('Enumerations');
    expect(labels).toContain('Functions');
    expect(labels).toContain('Variables');
    expect(labels).toContain('Type Aliases');
    expect(labels).not.toContain('Typedefs');
  });
});

describe('flavor: typedoc — full TS signatures', () => {
  it('renders a function page signature with type params, param types, and return', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.greet')!.body;
    expect(body).toContain('```ts');
    expect(body).toContain('greet<T extends string>(name: string): string');
  });

  it('renders an accessor as `get name(): Type` and a field as `name: Type`', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('get size(): number');
  });

  it('renders a full constructor signature with a typed return', () => {
    const m = generateSite(tsCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('new Widget(): Widget');
    expect(body).toContain('**Returns**');
  });
});

/**
 * A module with an overloaded standalone function and an overloaded class
 * method. Each first signature lives on the doclet; the extra signatures ride on
 * `overloads[]` (the shape the TypeDoc bridge produces from `signatures[1..]`).
 */
function overloadCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'module', name: 'lib', longname: 'module:lib', scope: 'global', comment: '/** Lib. */', description: 'The library.' },
    {
      kind: 'function',
      name: 'parse',
      longname: 'module:lib.parse',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** Parse. */',
      description: 'Parses input.',
      params: [{ name: 'text', type: { names: ['string'] }, description: 'A string.' }],
      returns: [{ type: { names: ['string'] } }],
      overloads: [
        {
          params: [{ name: 'value', type: { names: ['number'] }, description: 'A number.' }],
          returns: [{ type: { names: ['number'] } }],
          description: 'Parses a number instead.',
        },
      ],
    },
    {
      kind: 'class',
      name: 'Box',
      longname: 'module:lib.Box',
      memberof: 'module:lib',
      scope: 'static',
      classdesc: 'A box.',
      comment: '/** A box. */',
    },
    {
      kind: 'function',
      name: 'add',
      longname: 'module:lib.Box#add',
      memberof: 'module:lib.Box',
      scope: 'instance',
      comment: '/** Add. */',
      description: 'Adds an item.',
      params: [{ name: 'item', type: { names: ['string'] }, description: 'An item.' }],
      returns: [{ type: { names: ['void'] } }],
      overloads: [
        {
          params: [{ name: 'items', type: { names: ['Array.<string>'] }, description: 'Many items.' }],
          returns: [{ type: { names: ['void'] } }],
        },
      ],
    },
  ]);
}

describe('flavor: typedoc — overloaded signatures', () => {
  it('renders every signature of an overloaded standalone function', () => {
    const m = generateSite(overloadCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.parse')!.body;
    expect(body).toContain('parse(text: string): string');
    expect(body).toContain('parse(value: number): number');
    // Two `ts` signature blocks, one per overload.
    expect(body.match(/```ts/g)?.length).toBe(2);
  });

  it("renders each overload's own parameters and description", () => {
    const m = generateSite(overloadCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.parse')!.body;
    // The shared (first-signature) description shows once; the overload's own
    // description renders under its signature.
    expect(body).toContain('Parses input.');
    expect(body).toContain('Parses a number instead.');
    expect(body).toContain('value');
    expect(body).toContain('text');
  });

  it('renders every signature of an overloaded class method', () => {
    const m = generateSite(overloadCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Box')!.body;
    expect(body).toContain('add(item: string): void');
    expect(body).toContain('add(items: Array.<string>): void');
  });

  it('JSDoc flavor ignores overloads (only the first signature, no `ts` blocks)', () => {
    const m = generateSite(overloadCollection());
    const body = pageByLongname(m, 'module:lib.Box')!.body;
    expect(body).not.toContain('```ts');
    expect(body).not.toContain('Array.<string>');
  });
});

describe('flavor: jsdoc (default) — byte-identical: no new pages, JSDoc labels', () => {
  it('keeps member signatures in the heading (no per-member `ts` code block)', () => {
    // The JSDoc path must NOT emit the TypeDoc-style signature code blocks; the
    // signature stays in the member heading (`name(params) -> ret`).
    const m = generateSite(tsCollection());
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).not.toContain('```ts');
  });


  it('does NOT create enum/function/variable pages without the typedoc flavor', () => {
    const m = generateSite(tsCollection());
    const kinds = m.pages.map((p) => p.frontmatter.kind);
    expect(kinds).not.toContain('enum');
    expect(kinds).not.toContain('function');
    expect(kinds).not.toContain('variable');
  });

  it('labels type aliases "Typedefs" (not "Type Aliases")', () => {
    const m = generateSite(tsCollection());
    const labels = navLabels(m);
    expect(labels).toContain('Typedefs');
    expect(labels).not.toContain('Type Aliases');
  });
});
