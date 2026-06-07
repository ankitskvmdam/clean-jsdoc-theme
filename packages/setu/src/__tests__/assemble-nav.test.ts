import { describe, it, expect } from 'vitest';
import type { NavNode, Page } from '@clean-jsdoc-theme/utils';
import { assembleNav, DEFAULT_SECTION_ORDER, type MenuItem } from '../generate-site';

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
    expect(nav.find((n) => n.label === 'Source files')).toMatchObject({ slug: 'source', menu: true });
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
