import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { NavNode, Page, TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { assembleNav, buildContainerPage } from '../generate-site';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

/**
 * Minimal API page stub: only the fields `assembleNav` reads. `group` carries the
 * full `@category`/frontmatter group path; `order` the within-group sort key.
 */
function page(
  title: string,
  kind: Page['frontmatter']['kind'],
  slug: string,
  group?: string,
  order?: number,
): Page {
  return {
    slug,
    frontmatter: { title, kind, ...(group ? { group } : {}), ...(order !== undefined ? { order } : {}) },
    body: '',
    headings: [],
  };
}

/** Find a top-level group's leaf/branch nodes (the contiguous run with that `group`). */
function groupNodes(nav: readonly NavNode[], group: string): NavNode[] {
  return nav.filter((n) => n.group === group);
}

describe('@category → frontmatter.group', () => {
  it('reads the first @category tag onto a container page frontmatter', () => {
    const c = makeCollection([
      {
        kind: 'class',
        name: 'StreamReader',
        longname: 'StreamReader',
        memberof: undefined,
        tags: [
          { title: 'category', text: 'Core/Parsing' },
          { title: 'category', text: 'Ignored' },
        ],
      },
    ]);
    const p = buildContainerPage(c, 'StreamReader', 'class')!;
    // First @category wins; the `/`-path is preserved verbatim for nesting.
    expect(p.frontmatter.group).toBe('Core/Parsing');
  });

  it('leaves group unset (kind fallback) when untagged', () => {
    const c = makeCollection([
      { kind: 'class', name: 'Plain', longname: 'Plain' },
    ]);
    const p = buildContainerPage(c, 'Plain', 'class')!;
    expect(p.frontmatter.group).toBeUndefined();
  });

  it('ignores a blank @category text', () => {
    const c = makeCollection([
      { kind: 'class', name: 'Blank', longname: 'Blank', tags: [{ title: 'category', text: '  ' }] },
    ]);
    const p = buildContainerPage(c, 'Blank', 'class')!;
    expect(p.frontmatter.group).toBeUndefined();
  });

  it('parses an `order=` option into frontmatter.order, keeping the path clean', () => {
    const c = makeCollection([
      {
        kind: 'class',
        name: 'DataProcessor',
        longname: 'DataProcessor',
        tags: [{ title: 'category', text: 'Core/Processing order=1' }],
      },
    ]);
    const p = buildContainerPage(c, 'DataProcessor', 'class')!;
    expect(p.frontmatter.group).toBe('Core/Processing'); // option stripped off the path
    expect(p.frontmatter.order).toBe(1);
  });

  it('keeps a spaced category name that precedes the first option', () => {
    const c = makeCollection([
      {
        kind: 'class',
        name: 'Intro',
        longname: 'Intro',
        tags: [{ title: 'category', text: 'Getting Started order=2' }],
      },
    ]);
    const p = buildContainerPage(c, 'Intro', 'class')!;
    expect(p.frontmatter.group).toBe('Getting Started');
    expect(p.frontmatter.order).toBe(2);
  });

  it('leaves order unset for a missing or non-numeric value', () => {
    const c = makeCollection([
      {
        kind: 'class',
        name: 'NoOrder',
        longname: 'NoOrder',
        tags: [{ title: 'category', text: 'Core order=high' }],
      },
    ]);
    const p = buildContainerPage(c, 'NoOrder', 'class')!;
    expect(p.frontmatter.group).toBe('Core');
    expect(p.frontmatter.order).toBeUndefined();
  });
});

describe('assembleNav — kind fallback when untagged', () => {
  it('buckets an untagged API page under its kind label', () => {
    const nav = assembleNav({ apiPages: [page('Widget', 'class', 'widget')] });
    expect(groupNodes(nav, 'Classes').map((n) => n.label)).toEqual(['Widget']);
  });
});

describe('assembleNav — nested @category tree (depths 1/2/3)', () => {
  it('depth 1: a single-segment category is a flat leaf under the bold title', () => {
    const nav = assembleNav({
      apiPages: [page('Engine', 'class', 'engine', 'Core')],
      sectionOrder: ['Core'],
    });
    const core = groupNodes(nav, 'Core');
    expect(core).toHaveLength(1);
    expect(core[0]).toMatchObject({ label: 'Engine', slug: 'engine', group: 'Core' });
    expect(core[0].children).toBeUndefined();
  });

  it('depth 2: a deeper segment becomes a non-navigable branch with the leaf inside', () => {
    const nav = assembleNav({
      apiPages: [page('StreamReader', 'class', 'streamreader', 'Core/Parsing')],
      sectionOrder: ['Core'],
    });
    const core = groupNodes(nav, 'Core');
    expect(core).toHaveLength(1);
    const parsing = core[0];
    expect(parsing.label).toBe('Parsing');
    expect(parsing.slug).toBeUndefined(); // branch, not navigable
    expect(parsing.group).toBe('Core');
    expect(parsing.children!.map((c) => c.label)).toEqual(['StreamReader']);
    expect(parsing.children![0].slug).toBe('streamreader');
  });

  it('depth 3: branches nest one level deeper', () => {
    const nav = assembleNav({
      apiPages: [page('Token', 'class', 'token', 'Core/Parsing/Lexer')],
      sectionOrder: ['Core'],
    });
    const lexer = groupNodes(nav, 'Core')[0].children![0];
    expect(lexer.label).toBe('Lexer');
    expect(lexer.slug).toBeUndefined();
    expect(lexer.children!.map((c) => c.label)).toEqual(['Token']);
    expect(lexer.children![0].slug).toBe('token');
  });

  it('mixes leaves directly under a top group with nested branches', () => {
    const nav = assembleNav({
      apiPages: [
        page('CoreClass', 'class', 'coreclass', 'Core'),
        page('StreamReader', 'class', 'streamreader', 'Core/Parsing'),
      ],
      sectionOrder: ['Core'],
    });
    const core = groupNodes(nav, 'Core');
    // Leaves first, then branches; both carry group "Core".
    expect(core.map((n) => n.label)).toEqual(['CoreClass', 'Parsing']);
    expect(core[0].slug).toBe('coreclass');
    expect(core[1].children!.map((c) => c.label)).toEqual(['StreamReader']);
  });
});

describe('assembleNav — top-level order (listed-first, then alphabetical)', () => {
  it('orders listed labels first (mixing categories + kind labels), then unlisted categories alphabetically', () => {
    const nav = assembleNav({
      apiPages: [
        page('Z', 'class', 'z', 'Zeta'), // category, unlisted
        page('A', 'class', 'a', 'Alpha'), // category, unlisted
        page('Plain', 'class', 'plain'), // kind fallback → Classes (listed)
        page('Eng', 'class', 'eng', 'Core'), // category, listed
      ],
      sectionOrder: ['Core', 'Classes'],
    });
    // Build the visible top-group order from the contiguous runs.
    const seen: string[] = [];
    for (const n of nav) {
      const g = n.group;
      if (g && seen[seen.length - 1] !== g) seen.push(g);
    }
    // Listed first in listed order; then unlisted categories alphabetically.
    expect(seen).toEqual(['Core', 'Classes', 'Alpha', 'Zeta']);
  });

  it('drops an unlisted KIND label but never an unlisted category', () => {
    const nav = assembleNav({
      apiPages: [
        page('Mod', 'module', 'mod'), // kind → Modules (not listed → dropped)
        page('Cat', 'class', 'cat', 'Extras'), // category (not listed → kept)
      ],
      sectionOrder: ['Classes'],
    });
    expect(nav.some((n) => n.group === 'Modules')).toBe(false);
    expect(nav.some((n) => n.group === 'Extras')).toBe(true);
  });
});

describe('assembleNav — within-group order by order then title', () => {
  it('sorts a category bucket by frontmatter.order, then alphabetically', () => {
    const nav = assembleNav({
      apiPages: [
        page('Beta', 'class', 'beta', 'Core', 2),
        page('Alpha', 'class', 'alpha', 'Core', 1),
        page('Gamma', 'class', 'gamma', 'Core'), // no order → sorts last
        page('Delta', 'class', 'delta', 'Core'), // no order → after Gamma alphabetically
      ],
      sectionOrder: ['Core'],
    });
    expect(groupNodes(nav, 'Core').map((n) => n.label)).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma']);
  });

  it('orders within a nested branch too', () => {
    const nav = assembleNav({
      apiPages: [
        page('Second', 'class', 'second', 'Core/Parsing', 2),
        page('First', 'class', 'first', 'Core/Parsing', 1),
      ],
      sectionOrder: ['Core'],
    });
    const parsing = groupNodes(nav, 'Core')[0];
    expect(parsing.children!.map((c) => c.label)).toEqual(['First', 'Second']);
  });

  it('orders sibling subgroups by the min order of the pages inside them', () => {
    // Schema declared first, but Processing's page carries the lower order — so
    // the Processing branch must sort ahead of Schema (the `@category … order=`
    // use case: position a subgroup, not just a leaf).
    const nav = assembleNav({
      apiPages: [
        page('CoreSchema', 'module', 'module/coreschema', 'Core/Schema', 2),
        page('DataProcessor', 'class', 'dataprocessor', 'Core/Processing', 1),
      ],
      sectionOrder: ['Core'],
    });
    expect(groupNodes(nav, 'Core').map((n) => n.label)).toEqual(['Processing', 'Schema']);
  });

  it('falls back to leaves-before-branches, first-seen, when no order is set', () => {
    const nav = assembleNav({
      apiPages: [
        page('CoreClass', 'class', 'coreclass', 'Core'),
        page('Zebra', 'class', 'zebra', 'Core/Zsub'),
        page('Apple', 'class', 'apple', 'Core/Asub'),
      ],
      sectionOrder: ['Core'],
    });
    // Leaf first, then branches in first-seen order (Zsub before Asub) — unchanged.
    expect(groupNodes(nav, 'Core').map((n) => n.label)).toEqual(['CoreClass', 'Zsub', 'Asub']);
  });
});

describe('assembleNav — doc entries honor frontmatter.order within a group', () => {
  it('orders docs by order regardless of the builder/directory-walk order they arrive in', () => {
    // Arrives reversed (e.g. alphabetical directory walk: "configuration" before
    // "getting-started"), but frontmatter.order must win → order 1 then order 2.
    const nav = assembleNav({
      docs: [
        { label: 'Configuration', slug: 'configuration', group: 'Getting Started', order: 2 },
        { label: 'Getting Started', slug: 'getting-started', group: 'Getting Started', order: 1 },
      ],
      docGroups: ['Getting Started'],
    });
    expect(groupNodes(nav, 'Getting Started').map((n) => n.label)).toEqual([
      'Getting Started',
      'Configuration',
    ]);
  });
});

describe('assembleNav — clubSidebarItems only clubs category-less buckets', () => {
  it('clubs a kind-fallback bucket but leaves a category bucket nested as authored', () => {
    const nav = assembleNav({
      apiPages: [
        // Kind-fallback Modules bucket → clubbed by label prefix.
        page('base', 'module', 'module/base'),
        page('base/chains', 'module', 'module/base-chains'),
        // Category bucket with slash-labels → must NOT be additionally clubbed.
        page('queue/Queue', 'class', 'queue-queue', 'Core'),
        page('queue/Worker', 'class', 'queue-worker', 'Core'),
      ],
      sectionOrder: ['Core', 'Modules'],
      clubSidebarItems: true,
    });
    // Modules clubbed: a `base` parent branch with index + chains children.
    const mods = groupNodes(nav, 'Modules');
    expect(mods.map((n) => n.label)).toEqual(['base']);
    expect(mods[0].children!.map((c) => c.label)).toEqual(['index', 'chains']);
    // Core (category) NOT clubbed: the slash-labels stay flat leaves.
    const core = groupNodes(nav, 'Core');
    expect(core.map((n) => n.label)).toEqual(['queue/Queue', 'queue/Worker']);
    expect(core.every((n) => n.children === undefined)).toBe(true);
  });
});

describe('assembleNav — backward-compat boundary (THE regression guard)', () => {
  // A collection with NO @category and a kind-only sectionOrder must produce
  // byte-identical nav to the pre-nesting builder.
  const CLASSES = [
    page('DataProcessor', 'class', 'dataprocessor'),
    page('BaseEntity', 'class', 'baseentity'),
  ];
  const MODULES = [page('CoreSchema', 'module', 'module/coreschema')];
  const TUTORIAL_NAV: NavNode[] = [
    { label: 'Getting Started', slug: 'tutorials/getting-started', group: 'Tutorials', order: 0 },
    { label: 'Advanced', slug: 'tutorials/advanced', group: 'Tutorials', order: 1 },
  ];
  const HOME: NavNode = { label: 'Home', slug: '' };
  const SOURCE: NavNode = { label: 'Source Files', slug: 'source' };

  it('untagged + kind-only sectionOrder → exactly the legacy nav', () => {
    const nav = assembleNav({
      apiPages: [...CLASSES, ...MODULES],
      tutorials: TUTORIAL_NAV,
      home: HOME,
      source: SOURCE,
      sectionOrder: ['Classes', 'Modules', 'Tutorials'],
    });
    expect(nav).toEqual([
      { label: 'Home', slug: '', order: -1 },
      { label: 'BaseEntity', slug: 'baseentity', group: 'Classes', order: 0 },
      { label: 'DataProcessor', slug: 'dataprocessor', group: 'Classes', order: 0 },
      { label: 'CoreSchema', slug: 'module/coreschema', group: 'Modules', order: 1 },
      { label: 'Getting Started', slug: 'tutorials/getting-started', group: 'Tutorials', order: 2 },
      { label: 'Advanced', slug: 'tutorials/advanced', group: 'Tutorials', order: 2 },
      { label: 'Source Files', slug: 'source', order: 4 },
    ]);
  });
});
