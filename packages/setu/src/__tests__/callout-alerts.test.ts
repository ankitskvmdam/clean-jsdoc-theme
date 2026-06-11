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
