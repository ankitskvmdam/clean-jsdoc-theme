import { describe, it, expect } from 'vitest';
import type { RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { buildDocPages, type DocInput } from '../guide-view';

const isCallout = (node: unknown): node is MdxJsxFlowElement =>
  !!node &&
  (node as MdxJsxFlowElement).type === 'mdxJsxFlowElement' &&
  (node as MdxJsxFlowElement).name === 'Callout';

const typeOf = (node: MdxJsxFlowElement): string | undefined => {
  const attr = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'type');
  return attr && typeof attr.value === 'string' ? attr.value : undefined;
};

const firstBlock = (blocks: RootContent[]): RootContent => blocks[0];

describe('callout alerts — prose blockquote markers', () => {
  it('promotes `> [!INFO]` to a Callout type="info", stripping the marker', () => {
    const blocks = markdownToMdastBlocks('> [!INFO]\n> Heads up about this.');
    const node = firstBlock(blocks);
    expect(isCallout(node)).toBe(true);
    expect(typeOf(node as MdxJsxFlowElement)).toBe('info');
    const json = JSON.stringify(node);
    expect(json).toContain('Heads up about this.');
    expect(json).not.toContain('[!INFO]');
  });

  it('folds GitHub aliases onto rang variants (NOTE→info, TIP/SUCCESS→tip, CAUTION→warning, DANGER→error)', () => {
    const cases: Array<[string, string]> = [
      ['NOTE', 'info'],
      ['IMPORTANT', 'info'],
      ['TIP', 'tip'],
      ['SUCCESS', 'tip'],
      ['WARNING', 'warning'],
      ['CAUTION', 'warning'],
      ['ERROR', 'error'],
      ['DANGER', 'error'],
    ];
    for (const [marker, variant] of cases) {
      const node = firstBlock(markdownToMdastBlocks(`> [!${marker}]\n> body`));
      expect(isCallout(node), `${marker} should be a callout`).toBe(true);
      expect(typeOf(node as MdxJsxFlowElement), `${marker} → ${variant}`).toBe(variant);
    }
  });

  it('is case-insensitive on the marker keyword', () => {
    const node = firstBlock(markdownToMdastBlocks('> [!info]\n> lowercase marker'));
    expect(isCallout(node)).toBe(true);
    expect(typeOf(node as MdxJsxFlowElement)).toBe('info');
  });

  it('leaves a plain blockquote (no marker) as a blockquote', () => {
    const node = firstBlock(markdownToMdastBlocks('> just a quote'));
    expect(isCallout(node)).toBe(false);
    expect((node as { type: string }).type).toBe('blockquote');
  });

  it('leaves an unknown `[!FOO]` marker as a plain blockquote', () => {
    const node = firstBlock(markdownToMdastBlocks('> [!FOO]\n> not a known alert'));
    expect(isCallout(node)).toBe(false);
    expect((node as { type: string }).type).toBe('blockquote');
  });

  it('also works on HTML prose (the README path)', () => {
    const node = firstBlock(
      htmlToMdastBlocks('<blockquote><p>[!WARNING]\nBe careful.</p></blockquote>')
    );
    expect(isCallout(node)).toBe(true);
    expect(typeOf(node as MdxJsxFlowElement)).toBe('warning');
  });
});

describe('callout alerts — nested at any depth', () => {
  // Find the first Callout anywhere in the tree (GitHub renders alerts nested in
  // lists, so a callout may live below the top level).
  const findCallout = (node: unknown): MdxJsxFlowElement | undefined => {
    if (isCallout(node)) return node;
    const children = (node as { children?: unknown[] })?.children;
    if (Array.isArray(children)) {
      for (const c of children) {
        const hit = findCallout(c);
        if (hit) return hit;
      }
    }
    return undefined;
  };

  it('promotes an alert nested inside a list item (markdown path)', () => {
    const blocks = markdownToMdastBlocks('- first\n- second\n  > [!TIP]\n  > nested tip');
    // Top level stays a list (not promoted to a callout itself).
    expect(isCallout(firstBlock(blocks))).toBe(false);
    expect((firstBlock(blocks) as { type: string }).type).toBe('list');
    // …but the alert inside the list item is now a callout.
    const callout = findCallout({ type: 'root', children: blocks });
    expect(callout).toBeDefined();
    expect(typeOf(callout!)).toBe('tip');
    expect(JSON.stringify(callout)).not.toContain('[!TIP]');
  });

  it('promotes an alert nested inside a list item (HTML / README path)', () => {
    const blocks = htmlToMdastBlocks(
      '<ul><li>item<blockquote><p>[!WARNING]<br>nested warn</p></blockquote></li></ul>'
    );
    const callout = findCallout({ type: 'root', children: blocks });
    expect(callout).toBeDefined();
    expect(typeOf(callout!)).toBe('warning');
  });

  it('promotes an alert nested inside another (plain) blockquote', () => {
    const blocks = markdownToMdastBlocks('> outer quote\n>\n> > [!NOTE]\n> > inner note');
    const callout = findCallout({ type: 'root', children: blocks });
    expect(callout).toBeDefined();
    expect(typeOf(callout!)).toBe('info');
  });

  it('renders nested alerts end-to-end through buildDocPages', () => {
    const docs: DocInput[] = [
      { path: 'guide', type: 'markdown', content: '1. step one\n2. step two\n   > [!CAUTION]\n   > watch out\n' },
    ];
    const body = buildDocPages(docs).pages[0].body;
    expect(body).toContain('<Callout type="warning">');
    expect(body).not.toContain('[!CAUTION]');
  });
});

describe('callout alerts — end-to-end through buildDocPages', () => {
  it('renders `> [!INFO]` as <Callout type="info"> in the MDX body, no marker left', () => {
    const docs: DocInput[] = [
      { path: 'guide', type: 'markdown', content: '# Guide\n\n> [!INFO]\n> Useful tip here.\n' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].body).toContain('<Callout type="info">');
    expect(pages[0].body).toContain('Useful tip here.');
    expect(pages[0].body).not.toContain('[!INFO]');
  });
});
