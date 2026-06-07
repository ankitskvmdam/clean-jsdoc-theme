import { describe, it, expect } from 'vitest';
import type { InlineCode, Link, Paragraph, Root, Text } from 'mdast';
import { resolveLinkTags } from '../mdast/link-tags';
import { inlineCode, p, root, text } from '../mdast/builders';
import type { ResolvedLink } from '../link-registry';

/** Stub resolver: a couple of known targets, everything else unresolved. */
const resolve = (target: string): ResolvedLink | null => {
  switch (target) {
    case 'BaseEntity':
      return { href: '/baseentity', external: false };
    case 'base/chains#end':
      return { href: '/base-chains#end', external: false };
    case 'DataProcessor#streamEngine':
      return { href: '/dataprocessor#streamengine', external: false };
    case 'module:queue/types':
      return { href: '/queue-types', external: false };
    case 'https://en.wikipedia.org/wiki/Data_model':
      return { href: 'https://en.wikipedia.org/wiki/Data_model', external: true };
    default:
      return null;
  }
};

/** Build a root with a single paragraph holding the given text value. */
function para(value: string): Root {
  return root(p(text(value)));
}

/** First paragraph's children after a rewrite. */
function children(tree: Root): Paragraph['children'] {
  return (tree.children[0] as Paragraph).children;
}

describe('resolveLinkTags', () => {
  it('resolves a bare {@link namepath} to a link with the target as label', () => {
    const tree = para('{@link BaseEntity}');
    resolveLinkTags(tree, resolve);
    const kids = children(tree);
    expect(kids).toHaveLength(1);
    const node = kids[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('/baseentity');
    expect(node.children[0]).toEqual<Text>({ type: 'text', value: 'BaseEntity' });
  });

  it('uses an explicit pipe-delimited label', () => {
    const tree = para('{@link module:queue/types|type definitions}');
    resolveLinkTags(tree, resolve);
    const node = children(tree)[0] as Link;
    expect(node.url).toBe('/queue-types');
    expect((node.children[0] as Text).value).toBe('type definitions');
  });

  it('uses an explicit space-delimited label', () => {
    const tree = para('{@link BaseEntity the base entity}');
    resolveLinkTags(tree, resolve);
    const node = children(tree)[0] as Link;
    expect(node.url).toBe('/baseentity');
    expect((node.children[0] as Text).value).toBe('the base entity');
  });

  it('handles the leading-label form [label]{@link target}', () => {
    const tree = para('[end method]{@link base/chains#end}');
    resolveLinkTags(tree, resolve);
    const node = children(tree)[0] as Link;
    expect(node.url).toBe('/base-chains#end');
    expect((node.children[0] as Text).value).toBe('end method');
  });

  it('renders a resolved @linkcode label as an inlineCode child', () => {
    const tree = para('{@linkcode DataProcessor#streamEngine}');
    resolveLinkTags(tree, resolve);
    const node = children(tree)[0] as Link;
    expect(node.type).toBe('link');
    expect(node.url).toBe('/dataprocessor#streamengine');
    expect(node.children[0]).toEqual<InlineCode>({
      type: 'inlineCode',
      value: 'DataProcessor#streamEngine',
    });
  });

  it('resolves an external URL target with the explicit label', () => {
    const tree = para(
      '{@link https://en.wikipedia.org/wiki/Data_model|Data Modeling}'
    );
    resolveLinkTags(tree, resolve);
    const node = children(tree)[0] as Link;
    expect(node.url).toBe('https://en.wikipedia.org/wiki/Data_model');
    expect((node.children[0] as Text).value).toBe('Data Modeling');
  });

  it('falls back to inlineCode for an unresolved namepath (no link)', () => {
    const tree = para('{@link Nope}');
    resolveLinkTags(tree, resolve);
    const kids = children(tree);
    expect(kids).toHaveLength(1);
    expect(kids[0]).toEqual<InlineCode>({ type: 'inlineCode', value: 'Nope' });
  });

  it('leaves a {@link} inside an inlineCode node untouched', () => {
    const tree = root(p(inlineCode('{@link BaseEntity}')));
    resolveLinkTags(tree, resolve);
    const kids = children(tree);
    expect(kids).toHaveLength(1);
    expect(kids[0]).toEqual<InlineCode>({
      type: 'inlineCode',
      value: '{@link BaseEntity}',
    });
  });

  it('leaves a {@link} inside a code block untouched', () => {
    const tree: Root = {
      type: 'root',
      children: [{ type: 'code', lang: 'js', value: '// {@link BaseEntity}' }],
    };
    resolveLinkTags(tree, resolve);
    expect(tree.children[0]).toEqual({
      type: 'code',
      lang: 'js',
      value: '// {@link BaseEntity}',
    });
  });

  it('splits multiple tags and interleaved prose into the right sequence', () => {
    const tree = para('See {@link BaseEntity} and {@link Nope} here.');
    resolveLinkTags(tree, resolve);
    const kids = children(tree);
    expect(kids).toHaveLength(5);
    expect(kids[0]).toEqual<Text>({ type: 'text', value: 'See ' });
    expect((kids[1] as Link).type).toBe('link');
    expect((kids[1] as Link).url).toBe('/baseentity');
    expect(kids[2]).toEqual<Text>({ type: 'text', value: ' and ' });
    expect(kids[3]).toEqual<InlineCode>({ type: 'inlineCode', value: 'Nope' });
    expect(kids[4]).toEqual<Text>({ type: 'text', value: ' here.' });
  });

  it('leaves a text node with no tags untouched', () => {
    const tree = para('just plain prose');
    resolveLinkTags(tree, resolve);
    const kids = children(tree);
    expect(kids).toHaveLength(1);
    expect(kids[0]).toEqual<Text>({ type: 'text', value: 'just plain prose' });
  });

  it('recurses into nested phrasing parents (e.g. emphasis)', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'emphasis', children: [text('{@link BaseEntity}')] },
          ],
        },
      ],
    };
    resolveLinkTags(tree, resolve);
    const emphasis = children(tree)[0] as { children: Link[] };
    expect(emphasis.children[0].type).toBe('link');
    expect(emphasis.children[0].url).toBe('/baseentity');
  });
});
