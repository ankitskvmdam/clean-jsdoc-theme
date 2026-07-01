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
    // The signature is a shiki-highlighted inline <Signature>, not a code block.
    expect(body).toContain('<Signature');
    expect(body).toContain('greet<T extends string>(name: string): string');
    expect(body).not.toContain('```ts');
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
    // Two inline <Signature> blocks, one per overload (not code blocks).
    expect(body.match(/<Signature/g)?.length).toBe(2);
    expect(body).not.toContain('```ts');
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

/**
 * A module with a `Point` typedef (the bridge's object-literal-alias recovery
 * gives it `properties`) and a function whose parameter is typed `Point` — the
 * TypeDoc-bridge-shaped result of an inline object-literal PARAM being expanded
 * (Task 7): the flat `params[].type.names` still carries the bare reference name
 * `Point` (exactly what `typeToDocletType`/`ReferenceType.toString()` emits),
 * which `linkifyTypeExpression` tokenizes and resolves against the registry.
 */
function referenceLinkCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'module', name: 'lib', longname: 'module:lib', scope: 'global', comment: '/** Lib. */', description: 'The library.' },
    {
      kind: 'typedef',
      name: 'Point',
      longname: 'module:lib.Point',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** A point. */',
      description: 'A coordinate.',
      type: { names: ['Object'] },
      properties: [
        { name: 'x', type: { names: ['number'] }, description: 'Horizontal.' },
        { name: 'y', type: { names: ['number'] }, description: 'Vertical.' },
      ],
    },
    {
      kind: 'function',
      name: 'moveTo',
      longname: 'module:lib.moveTo',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** Move to. */',
      description: 'Moves to a point.',
      params: [{ name: 'p', type: { names: ['Point'] }, description: 'The point.' }],
      returns: [{ type: { names: ['void'] } }],
    },
  ]);
}

describe('flavor: typedoc — reference type names stay linkable', () => {
  it('renders a param typed `Point` as a link to the Point typedef page', () => {
    const m = generateSite(referenceLinkCollection(), { flavor: 'typedoc' });
    const pointPage = pageByLongname(m, 'module:lib.Point')!;
    const body = pageByLongname(m, 'module:lib.moveTo')!.body;
    // The bare reference name `Point` (as emitted by the bridge's
    // `typeToDocletType`) resolves via the registry to the typedef's own page —
    // no bridge/setu change needed, this is `linkifyTypeExpression`'s existing
    // token-resolution behavior.
    expect(body).toContain(`[Point](/${pointPage.slug})`);
  });
});

describe('flavor: jsdoc (default) — byte-identical: no new pages, JSDoc labels', () => {
  it('keeps member signatures in the heading (no per-member `ts` code block)', () => {
    // Neither flavor emits a signature code block anymore — a method/field signature
    // rides in its member heading (shiki-highlighted inline by rang). (The class
    // does carry a constructor <Signature>, which is expected.)
    const m = generateSite(tsCollection());
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).not.toContain('```ts');
    // The render method is a member heading, not a Signature block.
    expect(body).toContain('<MemberHeading');
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

/**
 * A module with the symbols whose standalone pages lead with a declaration block
 * (default-TypeDoc parity): an object-literal variable (members recovered onto
 * `properties`), a function-type type alias, a plain union alias, and an
 * interface with a method + a field.
 */
function declCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'module', name: 'lib', longname: 'module:lib', scope: 'global', comment: '/** Lib. */', description: 'The library.' },
    {
      kind: 'variable',
      name: 'STATUS',
      longname: 'module:lib.STATUS',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** Codes. */',
      description: 'Status codes.',
      type: { names: ['Object'] },
      properties: [
        { name: 'OK', type: { names: ['200'] }, description: 'Okay.' },
        { name: 'BAD', type: { names: ['400'] }, description: 'Bad.' },
      ],
    },
    {
      kind: 'typedef',
      name: 'Handler',
      longname: 'module:lib.Handler',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** A handler. */',
      description: 'Handles events.',
      type: { names: ['function'] },
      typeParams: [{ name: 'T' }],
      params: [{ name: 'evt', type: { names: ['T'] }, description: 'The event.' }],
      returns: [{ type: { names: ['void'] } }],
    },
    {
      kind: 'typedef',
      name: 'Mode',
      longname: 'module:lib.Mode',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** A mode. */',
      description: 'The mode.',
      type: { names: ["'a' | 'b'"] },
    },
    { kind: 'interface', name: 'Hooks', longname: 'module:lib.Hooks', memberof: 'module:lib', scope: 'static', comment: '/** Hooks. */', description: 'Lifecycle hooks.' },
    {
      kind: 'function',
      name: 'onMount',
      longname: 'module:lib.Hooks#onMount',
      memberof: 'module:lib.Hooks',
      scope: 'instance',
      comment: '/** On mount. */',
      description: 'Mounts.',
      optional: true,
      returns: [{ type: { names: ['void'] } }],
    },
    { kind: 'member', name: 'id', longname: 'module:lib.Hooks#id', memberof: 'module:lib.Hooks', scope: 'instance', comment: '/** Id. */', description: 'The id.', type: { names: ['string'] } },
  ]);
}

describe('flavor: typedoc — declaration blocks', () => {
  it('object-literal variable: shows the shape + a Properties list, no duplicate Type', () => {
    const m = generateSite(declCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.STATUS')!.body;
    expect(body).toContain('<Signature');
    expect(body).toContain('STATUS: {');
    expect(body).toContain('OK: 200;');
    // The recovered member docs render as a Properties list…
    expect(body).toContain('**Properties**');
    expect(body).toContain('Okay.');
    // …so the redundant inline "Type" section is dropped.
    expect(body).not.toContain('**Type**');
  });

  it('function-type alias: leads with an arrow signature', () => {
    const m = generateSite(declCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Handler')!.body;
    expect(body).toContain('Handler<T> = (evt: T) => void');
  });

  it('plain alias: leads with `Name = <type>` and drops the duplicate Type section', () => {
    const m = generateSite(declCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Mode')!.body;
    expect(body).toContain("Mode = 'a' | 'b'");
    expect(body).not.toContain('**Type**');
  });

  it('interface: leads with an `interface Name { … }` overview block', () => {
    const m = generateSite(declCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Hooks')!.body;
    expect(body).toContain('interface Hooks {');
    expect(body).toContain('onMount?(): void;');
    expect(body).toContain('id: string;');
  });

  it('JSDoc flavor: no `Name = …` declaration block for a typedef', () => {
    const m = generateSite(declCollection());
    const handler = pageByLongname(m, 'module:lib.Handler');
    if (handler) expect(handler.body).not.toContain('= (evt: T) =>');
  });
});

/**
 * A module with an interface (`Named`), a base class (`Base`) with an instance
 * method, and a class (`Widget`) that extends `Base`, implements `Named`, and
 * overrides `Base`'s method. `Named.implementations` points back at `Widget`
 * (the TypeDoc-bridge-shaped inverse edge from Task 1).
 */
function inheritanceCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'module', name: 'lib', longname: 'module:lib', scope: 'global', comment: '/** Lib. */', description: 'The library.' },
    {
      kind: 'interface',
      name: 'Named',
      longname: 'module:lib.Named',
      memberof: 'module:lib',
      scope: 'static',
      comment: '/** Named. */',
      description: 'Something with a name.',
      implementations: ['module:lib.Widget'],
    },
    {
      kind: 'function',
      name: 'getName',
      longname: 'module:lib.Named#getName',
      memberof: 'module:lib.Named',
      scope: 'instance',
      comment: '/** Get name. */',
      description: 'Returns the name.',
      returns: [{ type: { names: ['string'] } }],
    },
    {
      kind: 'class',
      name: 'Base',
      longname: 'module:lib.Base',
      memberof: 'module:lib',
      scope: 'static',
      classdesc: 'A base class.',
      comment: '/** A base class. */',
    },
    {
      kind: 'function',
      name: 'render',
      longname: 'module:lib.Base#render',
      memberof: 'module:lib.Base',
      scope: 'instance',
      comment: '/** Render. */',
      description: 'Renders the base.',
      returns: [{ type: { names: ['void'] } }],
    },
    {
      kind: 'function',
      name: 'toString',
      longname: 'module:lib.Base#toString',
      memberof: 'module:lib.Base',
      scope: 'instance',
      comment: '/** To string. */',
      description: 'Stringifies the base.',
      returns: [{ type: { names: ['string'] } }],
    },
    {
      kind: 'class',
      name: 'Widget',
      longname: 'module:lib.Widget',
      memberof: 'module:lib',
      scope: 'static',
      classdesc: 'A widget.',
      comment: '/** A widget. */',
      augments: ['module:lib.Base'],
      implements: ['module:lib.Named'],
    },
    {
      kind: 'function',
      name: 'render',
      longname: 'module:lib.Widget#render',
      memberof: 'module:lib.Widget',
      scope: 'instance',
      comment: '/** Render. */',
      description: 'Renders the widget.',
      returns: [{ type: { names: ['void'] } }],
      overrides: 'module:lib.Base#render',
      override: true,
    },
    {
      kind: 'function',
      name: 'getName',
      longname: 'module:lib.Widget#getName',
      memberof: 'module:lib.Widget',
      scope: 'instance',
      comment: '/** Get name. */',
      description: 'Returns the widget name.',
      returns: [{ type: { names: ['string'] } }],
      implementationOf: 'module:lib.Named#getName',
    },
  ]);
}

describe('flavor: typedoc — inheritance surfacing', () => {
  it('shows Hierarchy and Implements on a class page', () => {
    const m = generateSite(inheritanceCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('Hierarchy');
    expect(body).toContain('Implements');
    expect(body).toContain('Base');
    expect(body).toContain('Named');
  });

  it('shows Implemented By on an interface page', () => {
    const m = generateSite(inheritanceCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Named')!.body;
    expect(body).toContain('Implemented By');
    expect(body).toContain('Widget');
  });

  it('captions inherited and overriding members', () => {
    const m = generateSite(inheritanceCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('Inherited from');
    expect(body).toContain('Overrides');
  });

  it('captions a member implementing an interface method', () => {
    const m = generateSite(inheritanceCollection(), { flavor: 'typedoc' });
    const body = pageByLongname(m, 'module:lib.Widget')!.body;
    expect(body).toContain('Implementation of');
  });
});

describe('flavor: jsdoc (default) — no inheritance surfacing labels', () => {
  it('does not emit Hierarchy/Implements/Implemented By/Implementation of under jsdoc flavor', () => {
    const m = generateSite(inheritanceCollection(), {}); // default jsdoc
    const pages = m.pages;
    for (const p of pages) {
      expect(p.body).not.toContain('Implemented By');
      expect(p.body).not.toContain('Hierarchy');
      expect(p.body).not.toContain('Implementation of');
    }
  });
});
