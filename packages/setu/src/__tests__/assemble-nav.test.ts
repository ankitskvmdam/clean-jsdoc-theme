import { describe, it, expect } from 'vitest';
import type { NavNode, Page } from '@clean-jsdoc-theme/utils';
import { assembleNav, clubNavTree, DEFAULT_SECTION_ORDER, type MenuItem } from '../generate-site';

/** Minimal API page stub: only the fields `assembleNav` reads. */
function page(title: string, kind: Page['frontmatter']['kind'], slug: string): Page {
  return { slug, frontmatter: { title, kind }, body: '', headings: [] };
}

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

describe('assembleNav — section mode (default order)', () => {
  it('emits Home first, sections in default order, Source Files last', () => {
    const nav = assembleNav({
      apiPages: [...CLASSES, ...MODULES],
      tutorials: TUTORIAL_NAV,
      home: HOME,
      source: SOURCE,
    });
    const labels = nav.map((n) => n.label);
    expect(labels[0]).toBe('Home');
    expect(labels[labels.length - 1]).toBe('Source Files');
    // Classes come before Modules in DEFAULT_SECTION_ORDER.
    expect(labels.indexOf('BaseEntity')).toBeLessThan(labels.indexOf('CoreSchema'));
    // Default order leads with Classes.
    expect(DEFAULT_SECTION_ORDER[0]).toBe('Classes');
  });

  it('alphabetizes within a section but keeps tutorials in tree order', () => {
    const nav = assembleNav({ apiPages: CLASSES, tutorials: TUTORIAL_NAV });
    const classLabels = nav.filter((n) => n.group === 'Classes').map((n) => n.label);
    expect(classLabels).toEqual(['BaseEntity', 'DataProcessor']);
    const tut = nav.filter((n) => n.group === 'Tutorials').map((n) => n.label);
    expect(tut).toEqual(['Getting Started', 'Advanced']);
  });
});

describe('assembleNav — nested tutorials (issue #253)', () => {
  // A parent tutorial ("Processing Guide") whose sub-tutorials carry a nested
  // `Tutorials/<parent>` group, exactly as tutorialsToDocInputs emits them.
  const NESTED: NavNode[] = [
    { label: 'Getting Started', slug: 'tutorials/getting-started', group: 'Tutorials', order: 0 },
    {
      label: 'Processing Guide',
      slug: 'tutorials/processing-guide',
      group: 'Tutorials/Processing Guide',
      order: 1,
    },
    {
      label: 'Configuration',
      slug: 'tutorials/configuration',
      group: 'Tutorials/Processing Guide',
      order: 2,
    },
    {
      label: 'Advanced Usage',
      slug: 'tutorials/advanced-usage',
      group: 'Tutorials/Processing Guide',
      order: 3,
    },
  ];

  it('nests sub-tutorials under a collapsible branch named after the parent', () => {
    const nav = assembleNav({ tutorials: NESTED, sectionOrder: ['Tutorials'] });
    const tut = nav.filter((n) => n.group === 'Tutorials');
    // Top level: a flat "Getting Started" leaf + a "Processing Guide" branch.
    const gs = tut.find((n) => n.label === 'Getting Started')!;
    expect(gs.slug).toBe('tutorials/getting-started');
    expect(gs.children).toBeUndefined();
    const branch = tut.find((n) => n.label === 'Processing Guide')!;
    expect(branch.slug).toBeUndefined(); // a branch, not a link
    // The parent's own page is the first entry inside its branch, then children.
    expect(branch.children!.map((c) => c.label)).toEqual([
      'Processing Guide',
      'Configuration',
      'Advanced Usage',
    ]);
    expect(branch.children![0].slug).toBe('tutorials/processing-guide');
  });

  it('leaves a flat tutorial set ungrouped (no spurious nesting)', () => {
    const nav = assembleNav({ tutorials: TUTORIAL_NAV, sectionOrder: ['Tutorials'] });
    const tut = nav.filter((n) => n.group === 'Tutorials');
    expect(tut.every((n) => !n.children)).toBe(true);
    expect(tut.map((n) => n.label)).toEqual(['Getting Started', 'Advanced']);
  });
});

describe('assembleNav — sectionOrder (filter + order)', () => {
  it('renders only the listed sections, in the listed order', () => {
    const nav = assembleNav({
      apiPages: [...CLASSES, ...MODULES],
      tutorials: TUTORIAL_NAV,
      sectionOrder: ['Tutorials', 'Classes'],
    });
    const groups = nav.map((n) => n.group);
    // Modules dropped (not listed); Tutorials before Classes.
    expect(groups).not.toContain('Modules');
    expect(groups.indexOf('Tutorials')).toBeLessThan(groups.indexOf('Classes'));
  });

  it('still always includes Home (first) and Source Files (last)', () => {
    const nav = assembleNav({
      apiPages: MODULES,
      home: HOME,
      source: SOURCE,
      sectionOrder: ['Classes'], // Modules filtered out
    });
    expect(nav[0].label).toBe('Home');
    expect(nav[nav.length - 1].label).toBe('Source Files');
    expect(nav.some((n) => n.group === 'Modules')).toBe(false);
  });
});

describe('clubNavTree', () => {
  const node = (label: string, slug: string): NavNode => ({ label, slug, group: 'Modules' });

  it('clubs a shared prefix into a parent branch, bare module → index child', () => {
    const out = clubNavTree([
      node('base', 'module/base'),
      node('base/chains', 'module/base-chains'),
    ]);
    expect(out).toHaveLength(1);
    const parent = out[0];
    expect(parent.label).toBe('base');
    expect(parent.slug).toBeUndefined(); // non-navigable branch
    expect(parent.group).toBe('Modules');
    // `index` (the bare module) leads, then the rest; prefix stripped from labels.
    expect(parent.children!.map((c) => c.label)).toEqual(['index', 'chains']);
    // Children keep their original slugs.
    expect(parent.children![0].slug).toBe('module/base');
    expect(parent.children![1].slug).toBe('module/base-chains');
  });

  it('does NOT club a prefix used by a single entry', () => {
    const out = clubNavTree([node('strings/format', 'module/strings-format')]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(node('strings/format', 'module/strings-format'));
    expect(out[0].children).toBeUndefined();
  });

  it('alphabetizes club children (after the leading index) and preserves prefix order', () => {
    const out = clubNavTree([
      node('queue', 'module/queue'),
      node('queue/Queue', 'module/queue-queue'),
      node('queue/types', 'module/queue-types'),
      node('queue/AbstractJob', 'module/queue-abstractjob'),
      node('strings/format', 'module/strings-format'),
    ]);
    expect(out.map((n) => n.label)).toEqual(['queue', 'strings/format']); // prefix order kept
    expect(out[0].children!.map((c) => c.label)).toEqual([
      'index',
      'AbstractJob',
      'Queue',
      'types',
    ]);
    expect(out[1].children).toBeUndefined(); // lone strings/format stays flat
  });
});

describe('assembleNav — clubSidebarItems', () => {
  const MODS = [
    page('base', 'module', 'module/base'),
    page('base/chains', 'module', 'module/base-chains'),
    page('strings/format', 'module', 'module/strings-format'),
  ];

  it('clubs section entries when enabled, leaving singletons flat', () => {
    const nav = assembleNav({ apiPages: MODS, clubSidebarItems: true });
    const mods = nav.filter((n) => n.group === 'Modules');
    expect(mods.map((n) => n.label)).toEqual(['base', 'strings/format']);
    const base = mods.find((n) => n.label === 'base')!;
    expect(base.children!.map((c) => c.label)).toEqual(['index', 'chains']);
    expect(mods.find((n) => n.label === 'strings/format')!.children).toBeUndefined();
  });

  it('leaves entries flat when disabled (default)', () => {
    const nav = assembleNav({ apiPages: MODS });
    const labels = nav.filter((n) => n.group === 'Modules').map((n) => n.label);
    expect(labels).toEqual(['base', 'base/chains', 'strings/format']);
    expect(nav.every((n) => n.children === undefined)).toBe(true);
  });
});

describe('assembleNav — menu (top region) + sections below', () => {
  const menu: MenuItem[] = [
    { id: 'home', title: 'Start' },
    { id: 'github', title: 'GitHub', link: 'https://github.com/x/y' },
    { id: 'npm', title: 'NPM', link: 'https://npmjs.com/package/x' },
    { id: 'source', title: 'Source files' },
  ];

  it('emits menu entries (flagged + iconned) first, then API sections per sectionOrder', () => {
    const nav = assembleNav({
      apiPages: [...CLASSES, ...MODULES],
      home: HOME,
      source: SOURCE,
      sectionOrder: ['Modules', 'Classes'],
      menu,
    });
    const menuNodes = nav.filter((n) => n.menu);
    // The four menu entries lead, in order.
    expect(menuNodes.map((n) => n.label)).toEqual(['Start', 'GitHub', 'NPM', 'Source files']);
    // The API sections still render below, ordered by sectionOrder.
    const groups = nav.filter((n) => !n.menu).map((n) => n.group);
    expect(groups.indexOf('Modules')).toBeLessThan(groups.indexOf('Classes'));
    // Home/source appear ONLY as menu entries (not duplicated as section nodes).
    expect(nav.filter((n) => !n.menu && (n.slug === '' || n.slug === 'source'))).toHaveLength(0);
  });

  it('marks externals (href + target) and resolves built-in internal links', () => {
    const nav = assembleNav({ apiPages: CLASSES, home: HOME, source: SOURCE, menu });
    const gh = nav.find((n) => n.label === 'GitHub')!;
    expect(gh).toMatchObject({ href: 'https://github.com/x/y', external: true, menu: true });
    expect(gh.slug).toBeUndefined();
    // Built-ins keep their internal slug (not external).
    expect(nav.find((n) => n.label === 'Start')).toMatchObject({ slug: '', menu: true });
    expect(nav.find((n) => n.label === 'Source files')).toMatchObject({
      slug: 'source',
      menu: true,
    });
  });

  it('defaults icons by role (prefixed); an explicit icon wins', () => {
    const nav = assembleNav({
      home: HOME,
      source: SOURCE,
      menu: [
        { id: 'home' }, // → lucide:home
        { id: 'source' }, // → lucide:code-xml
        { id: 'github', link: 'https://github.com/x/y' }, // no icon → lucide:external-link
        { id: 'gh', link: 'https://x.com/y', icon: 'simpleicons:github' }, // explicit wins
      ],
    });
    expect(nav.find((n) => n.slug === '')!.icon).toBe('lucide:home');
    expect(nav.find((n) => n.slug === 'source')!.icon).toBe('lucide:code-xml');
    expect(nav.find((n) => n.href === 'https://github.com/x/y')!.icon).toBe('lucide:external-link');
    expect(nav.find((n) => n.href === 'https://x.com/y')!.icon).toBe('simpleicons:github');
  });

  it('accepts the `sourceFile` id alias and `href` alias for the link', () => {
    const nav = assembleNav({
      source: SOURCE,
      menu: [{ id: 'sourceFile' }, { id: 'gh', href: 'https://github.com/x/y' }],
    });
    expect(nav.find((n) => n.slug === 'source')).toBeTruthy();
    expect(nav.find((n) => n.href === 'https://github.com/x/y')).toBeTruthy();
  });

  it('skips a built-in whose target does not exist (e.g. home with no README)', () => {
    const nav = assembleNav({
      apiPages: CLASSES,
      menu: [{ id: 'home' }, { id: 'source' }, { id: 'gh', link: 'https://x.y' }],
    });
    // No home/source provided → only the external link survives in the menu.
    const menuNodes = nav.filter((n) => n.menu);
    expect(menuNodes).toHaveLength(1);
    expect(menuNodes[0].href).toBe('https://x.y');
    // Sections still render.
    expect(nav.some((n) => n.group === 'Classes')).toBe(true);
  });
});
