import { describe, it, expect } from 'vitest';
import type { Link, List, Text } from 'mdast';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import { metadataList, seeInline } from '../mdast/doclet';
import type { ResolvedLink } from '../link-registry';

/**
 * Stub resolver: a fixed map of namepaths → hrefs, plus a URL passthrough that
 * mirrors the real `makeLinkResolver` shape. Anything unknown returns `null`.
 */
function stubResolver(): (t: string) => ResolvedLink | null {
  const map = new Map<string, string>([
    ['base/chains#open', '/base-chains#open'],
    ['base#addDefaultOptions', '/base#addDefaultOptions'],
    ['Queue', '/queue'],
  ]);
  return (target: string): ResolvedLink | null => {
    const t = target.trim();
    if (/^(https?:)?\/\//i.test(t) || /^mailto:/i.test(t)) {
      return { href: t, external: true };
    }
    const href = map.get(t);
    return href ? { href, external: false } : null;
  };
}

describe('seeInline — legacy behavior (no resolver)', () => {
  it('yields plain text for a bare namepath', () => {
    const out = seeInline('SomeNamepath');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ type: 'text', value: 'SomeNamepath' });
  });

  it('still turns {@link URL|label} into a link', () => {
    const out = seeInline('{@link http://x|y}');
    expect(out).toHaveLength(1);
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('http://x');
    expect((node.children[0] as Text).value).toBe('y');
  });

  it('still turns a bare URL into a link', () => {
    const out = seeInline('https://example.com');
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('https://example.com');
  });
});

describe('seeInline — with resolver', () => {
  const resolve = stubResolver();

  it('resolves a bare namepath to a link with text label', () => {
    const out = seeInline('base/chains#open', resolve);
    expect(out).toHaveLength(1);
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('/base-chains#open');
    expect((node.children[0] as Text).value).toBe('base/chains#open');
  });

  it('strips a wrapping brace pair (@see {namepath}) then resolves', () => {
    const out = seeInline('{base#addDefaultOptions}', resolve);
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('/base#addDefaultOptions');
    expect((node.children[0] as Text).value).toBe('base#addDefaultOptions');
  });

  it('resolves an external URL to an external link', () => {
    const out = seeInline('https://example.com', resolve);
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('https://example.com');
  });

  it('falls back to plain text for an unknown namepath (no broken link)', () => {
    const out = seeInline('Totally/Unknown#thing', resolve);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ type: 'text', value: 'Totally/Unknown#thing' });
  });

  it('resolves a {@link …} tag inside @see', () => {
    const out = seeInline('{@link Queue}', resolve);
    const node = out[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('/queue');
    expect((node.children[0] as Text).value).toBe('Queue');
  });

  it('resolves a leading {@link …} tag and keeps trailing prose (option a)', () => {
    const out = seeInline('{@link Queue} for the main engine.', resolve);
    expect(out).toHaveLength(2);
    const linkNode = out[0] as Link;
    expect(linkNode.type).toBe('link');
    expect(linkNode.url).toBe('/queue');
    const rest = out[1] as Text;
    expect(rest.type).toBe('text');
    expect(rest.value).toBe(' for the main engine.');
  });

  it('falls back to plain text when a leading tag is unresolved', () => {
    const see = '{@link Unknown} blah';
    const out = seeInline(see, resolve);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ type: 'text', value: see });
  });
});

describe('metadataList — resolveLink threading', () => {
  it('renders a See row with a link when the resolver resolves the target', () => {
    const resolve = stubResolver();
    const doclet = { see: ['base/chains#open'] } as unknown as TDoclet;
    const list = metadataList(doclet, { resolveLink: resolve }) as List;
    expect(list).not.toBeNull();
    expect(list.type).toBe('list');

    // Find the link node anywhere in the See sublist.
    const links: Link[] = [];
    const collect = (node: unknown): void => {
      if (node && typeof node === 'object') {
        if ((node as { type?: string }).type === 'link') links.push(node as Link);
        const children = (node as { children?: unknown[] }).children;
        if (Array.isArray(children)) children.forEach(collect);
      }
    };
    collect(list);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('/base-chains#open');
  });

  it('renders a See row as plain text when no resolver is passed', () => {
    const doclet = { see: ['base/chains#open'] } as unknown as TDoclet;
    const list = metadataList(doclet) as List;
    const links: Link[] = [];
    const collect = (node: unknown): void => {
      if (node && typeof node === 'object') {
        if ((node as { type?: string }).type === 'link') links.push(node as Link);
        const children = (node as { children?: unknown[] }).children;
        if (Array.isArray(children)) children.forEach(collect);
      }
    };
    collect(list);
    expect(links).toHaveLength(0);
  });
});

describe('metadataList — resolveTutorial threading', () => {
  const collectLinks = (node: unknown, links: Link[]): void => {
    if (node && typeof node === 'object') {
      if ((node as { type?: string }).type === 'link') links.push(node as Link);
      const children = (node as { children?: unknown[] }).children;
      if (Array.isArray(children)) children.forEach((c) => collectLinks(c, links));
    }
  };

  it('renders a Tutorials row with a titled link when the resolver resolves', () => {
    const resolveTutorial = (name: string) =>
      name === 'getting-started'
        ? { href: '/tutorials/getting-started', title: 'Getting Started' }
        : null;
    const doclet = { tutorials: ['getting-started'] } as unknown as TDoclet;
    const list = metadataList(doclet, { resolveTutorial }) as List;
    const links: Link[] = [];
    collectLinks(list, links);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('/tutorials/getting-started');
    expect((links[0].children[0] as Text).value).toBe('Getting Started');
  });

  it('falls back to plain text for an unknown tutorial name', () => {
    const resolveTutorial = () => null;
    const doclet = { tutorials: ['nope'] } as unknown as TDoclet;
    const list = metadataList(doclet, { resolveTutorial }) as List;
    const links: Link[] = [];
    collectLinks(list, links);
    expect(links).toHaveLength(0);
  });

  it('renders a Tutorials row as plain text when no resolver is passed', () => {
    const doclet = { tutorials: ['getting-started'] } as unknown as TDoclet;
    const list = metadataList(doclet) as List;
    const links: Link[] = [];
    collectLinks(list, links);
    expect(links).toHaveLength(0);
  });
});
