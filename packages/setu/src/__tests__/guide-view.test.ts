import { describe, it, expect } from 'vitest';
import type { Root } from 'mdast';
import { slugifyPath, type NavNode, type Page } from '@clean-jsdoc-theme/utils';
import {
  buildDocPages,
  buildTutorialPages,
  parseFrontmatter,
  tutorialsToDocInputs,
  type DocInput,
  type TutorialInput,
} from '../guide-view';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { toMdx } from '../mdx';
import { extractHeadings } from '../generate-site';

describe('parseFrontmatter', () => {
  it('parses a valid block and strips it from the body', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: Getting Started\norder: 3\nhidden: true\n---\n# Heading\n\nBody.'
    );
    expect(data).toEqual({ title: 'Getting Started', order: 3, hidden: true });
    expect(body).toBe('# Heading\n\nBody.');
  });

  it('returns the raw content untouched when there is no block', () => {
    const raw = '# Heading\n\nNo frontmatter here.';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });

  it('does not treat a non-leading --- as frontmatter', () => {
    const raw = 'Intro paragraph.\n\n---\ntitle: nope\n---\n';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });

  it('treats an unterminated block as no frontmatter (never throws)', () => {
    const raw = '---\ntitle: oops\nno closing fence\n# Heading';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });

  it('parses quoted strings, numbers, and booleans', () => {
    const { data } = parseFrontmatter(
      '---\ntitle: "A: Title"\nslug: \'my/slug\'\norder: 2\nhidden: false\nlabel: bare\n---\nbody'
    );
    expect(data).toEqual({
      title: 'A: Title',
      slug: 'my/slug',
      order: 2,
      hidden: false,
      label: 'bare',
    });
  });

  it('skips comment and blank lines, and keys without a colon', () => {
    const { data } = parseFrontmatter('---\n# a comment\n\ntitle: Ok\nnotapair\n---\nx');
    expect(data).toEqual({ title: 'Ok' });
  });

  it('handles CRLF newlines', () => {
    const { data, body } = parseFrontmatter('---\r\ntitle: CRLF\r\n---\r\nBody line.');
    expect(data).toEqual({ title: 'CRLF' });
    expect(body).toBe('Body line.');
  });
});

describe('buildDocPages — slug from path', () => {
  it('slugifies a flat path with no prefix', () => {
    const docs: DocInput[] = [{ path: 'getting-started', content: '# Hi', type: 'markdown' }];
    const { pages } = buildDocPages(docs);
    expect(pages[0].slug).toBe('getting-started');
  });

  it('slugifies a nested path segment-by-segment', () => {
    const docs: DocInput[] = [
      { path: 'guides/Advanced Topics', content: '# Hi', type: 'markdown' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].slug).toBe('guides/advanced-topics');
  });

  it('honors a frontmatter slug override', () => {
    const docs: DocInput[] = [
      { path: 'guides/advanced', content: '---\nslug: custom/place\n---\n# Hi', type: 'markdown' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].slug).toBe('custom/place');
  });
});

describe('buildDocPages — group precedence', () => {
  it('uses frontmatter group over directory and input', () => {
    const docs: DocInput[] = [
      {
        path: 'guides/advanced',
        content: '---\ngroup: Explicit\n---\n# Hi',
        type: 'markdown',
        group: 'FromInput',
      },
    ];
    const { pages, nav } = buildDocPages(docs);
    expect(pages[0].frontmatter.group).toBe('Explicit');
    expect(nav[0].group).toBe('Explicit');
  });

  it('falls back to the humanized directory path', () => {
    const docs: DocInput[] = [
      { path: 'getting-started/install-steps', content: '# Hi', type: 'markdown' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.group).toBe('Getting Started');
  });

  it('joins nested directory segments with humanized labels', () => {
    const docs: DocInput[] = [{ path: 'a-b/c-d/leaf', content: '# Hi', type: 'markdown' }];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.group).toBe('A B/C D');
  });

  it('falls back to defaultDocGroup for a root-level file', () => {
    const docs: DocInput[] = [{ path: 'overview', content: '# Hi', type: 'markdown' }];
    const { pages } = buildDocPages(docs, { defaultDocGroup: 'Docs' });
    expect(pages[0].frontmatter.group).toBe('Docs');
  });

  it('leaves group undefined for a root-level file with no default', () => {
    const docs: DocInput[] = [{ path: 'overview', content: '# Hi', type: 'markdown' }];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.group).toBeUndefined();
  });
});

describe('buildDocPages — title humanization', () => {
  it('humanizes the basename when no title is supplied', () => {
    const docs: DocInput[] = [
      { path: 'guides/getting-started', content: '# Hi', type: 'markdown' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.title).toBe('Getting Started');
  });

  it('prefers frontmatter title over input title over basename', () => {
    const docs: DocInput[] = [
      {
        path: 'guides/raw-name',
        content: '---\ntitle: FM Title\n---\n# Hi',
        type: 'markdown',
        title: 'Input Title',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.title).toBe('FM Title');
  });

  it('uses input title when frontmatter has none', () => {
    const docs: DocInput[] = [
      { path: 'guides/raw-name', content: '# Hi', type: 'markdown', title: 'Input Title' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].frontmatter.title).toBe('Input Title');
  });
});

describe('buildDocPages — root index → home', () => {
  it('maps a root index.md to the home page (slug "", kind index, no nav)', () => {
    const docs: DocInput[] = [
      { path: 'index', content: '---\ntitle: Welcome\n---\n# Welcome', type: 'markdown' },
    ];
    const { pages, nav } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].slug).toBe('');
    expect(pages[0].frontmatter.kind).toBe('index');
    expect(pages[0].frontmatter.title).toBe('Welcome');
    expect(nav).toHaveLength(0);
  });
});

describe('buildDocPages — hidden + empty handling', () => {
  it('renders a hidden page but emits no nav entry', () => {
    const docs: DocInput[] = [
      { path: 'secret', content: '---\nhidden: true\n---\n# Secret', type: 'markdown' },
    ];
    const { pages, nav } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].frontmatter.hidden).toBe(true);
    expect(nav).toHaveLength(0);
  });

  it('skips a page whose body is empty after frontmatter strip', () => {
    const docs: DocInput[] = [
      { path: 'empty', content: '---\ntitle: Empty\n---\n', type: 'markdown' },
    ];
    const { pages, nav } = buildDocPages(docs);
    expect(pages).toHaveLength(0);
    expect(nav).toHaveLength(0);
  });
});

describe('buildDocPages — frontmatter gating', () => {
  it('does NOT strip frontmatter when parseFrontmatter is false', () => {
    const docs: DocInput[] = [
      { path: 'doc', content: '---\ntitle: X\n---\n# Body', type: 'markdown' },
    ];
    const stripped = buildDocPages(docs, { parseFrontmatter: true });
    const verbatim = buildDocPages(docs, { parseFrontmatter: false });
    // With parsing off, the leading `---` survives into the rendered body
    // (as a thematic break / heading), so the bodies differ.
    expect(verbatim.pages[0].body).not.toBe(stripped.pages[0].body);
    expect(verbatim.pages[0].frontmatter.title).toBe('Doc'); // humanized basename, FM ignored
  });
});

/**
 * The pre-refactor `buildTutorialPages` behavior, reproduced verbatim, to assert
 * the adapter + builder remain byte-identical to it.
 */
function legacyBuildTutorialPages(tutorials: readonly TutorialInput[]): {
  pages: Page[];
  nav: NavNode[];
} {
  const TUTORIAL_SLUG_PREFIX = 'tutorials';
  const pages: Page[] = [];
  const nav: NavNode[] = [];
  let order = 0;
  const contentToMdast = (content: string, type: 'markdown' | 'html'): Root => ({
    type: 'root',
    children: type === 'html' ? htmlToMdastBlocks(content) : markdownToMdastBlocks(content),
  });
  const buildTutorialPage = (t: TutorialInput): Page | null => {
    const content = typeof t.content === 'string' ? t.content : '';
    const tree = contentToMdast(content, t.type);
    if (tree.children.length === 0) return null;
    const title = t.title?.trim() || t.name;
    const slug = `${TUTORIAL_SLUG_PREFIX}/${slugifyPath([t.name])}`;
    const frontmatter = { title, kind: 'guide' as const };
    const body = toMdx(tree, { frontmatter });
    const headings = extractHeadings(tree);
    return { slug, frontmatter, body, mdast: tree, headings };
  };
  const walk = (t: TutorialInput): void => {
    const page = buildTutorialPage(t);
    if (page) {
      pages.push(page);
      nav.push({
        label: page.frontmatter.title,
        slug: page.slug,
        group: 'Tutorials',
        order: order++,
      });
    }
    for (const child of t.children ?? []) walk(child);
  };
  for (const t of tutorials) walk(t);
  return { pages, nav };
}

describe('tutorialsToDocInputs + buildTutorialPages — byte-identical to legacy', () => {
  const TUTORIALS: TutorialInput[] = [
    {
      name: 'getting-started',
      title: 'Getting Started',
      type: 'markdown',
      content: '# Getting Started\n\nWelcome.\n\n## Install\n\nRun the thing.',
      children: [
        {
          name: 'install',
          title: 'Install',
          type: 'markdown',
          content: '# Install\n\n- step one\n- step two',
        },
      ],
    },
    {
      name: 'advanced',
      title: 'Advanced',
      type: 'html',
      content: '<h1>Advanced</h1><p>Deep dive with a <a href="https://x.y">link</a>.</p>',
    },
  ];

  it('the adapter assigns tutorials/<name>, Tutorials group, and incrementing order', () => {
    const inputs = tutorialsToDocInputs(TUTORIALS);
    expect(inputs.map((d) => d.path)).toEqual([
      'tutorials/getting-started',
      'tutorials/install',
      'tutorials/advanced',
    ]);
    expect(inputs.map((d) => d.order)).toEqual([0, 1, 2]);
    expect(inputs.every((d) => d.group === 'Tutorials')).toBe(true);
  });

  it('produces byte-identical pages + nav to the legacy builder', () => {
    const legacy = legacyBuildTutorialPages(TUTORIALS);
    const next = buildTutorialPages(TUTORIALS);

    expect(next.pages.map((p) => p.slug)).toEqual(legacy.pages.map((p) => p.slug));
    expect(next.pages.map((p) => p.frontmatter)).toEqual(legacy.pages.map((p) => p.frontmatter));
    expect(next.pages.map((p) => p.body)).toEqual(legacy.pages.map((p) => p.body));
    expect(next.pages.map((p) => p.headings)).toEqual(legacy.pages.map((p) => p.headings));
    expect(next.nav).toEqual(legacy.nav);
  });

  it('keeps tutorial page frontmatter to { title, kind } only (no group/order)', () => {
    const { pages } = buildTutorialPages(TUTORIALS);
    for (const p of pages) {
      expect(Object.keys(p.frontmatter).sort()).toEqual(['kind', 'title']);
      expect(p.frontmatter.kind).toBe('guide');
    }
  });

  it('does not strip frontmatter from tutorial content (byte-identical guarantee)', () => {
    const tutorials: TutorialInput[] = [
      { name: 'fm', title: 'FM', type: 'markdown', content: '---\nfoo: bar\n---\n# Body' },
    ];
    const legacy = legacyBuildTutorialPages(tutorials);
    const next = buildTutorialPages(tutorials);
    expect(next.pages[0].body).toBe(legacy.pages[0].body);
  });
});
