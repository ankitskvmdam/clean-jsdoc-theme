import { describe, it, expect } from 'vitest';
import type { RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { markdownToMdastBlocks } from '../mdast/from-html';
import { buildDocPages, type DocInput } from '../guide-view';

const isJsx =
  (name: string) =>
  (node: unknown): node is MdxJsxFlowElement =>
    !!node &&
    (node as MdxJsxFlowElement).type === 'mdxJsxFlowElement' &&
    (node as MdxJsxFlowElement).name === name;

const isSteps = isJsx('Steps');
const isStep = isJsx('Step');
const isTabs = isJsx('Tabs');
const isTab = isJsx('Tab');
const isCallout = isJsx('Callout');

const labelOf = (node: MdxJsxFlowElement): string | undefined => {
  const attr = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'label');
  return attr && typeof attr.value === 'string' ? attr.value : undefined;
};

const jsxChildren = (node: MdxJsxFlowElement, name: string): MdxJsxFlowElement[] =>
  node.children.filter(isJsx(name) as (n: unknown) => n is MdxJsxFlowElement);

const firstBlock = (blocks: RootContent[]): RootContent => blocks[0];

describe('containers — <steps>/<step> in prose markdown', () => {
  it('converts <steps> into a Steps node with two labelled Step children, content preserved', () => {
    const blocks = markdownToMdastBlocks(
      '<steps>\n<step label="Install">\nRun `npm i`.\n</step>\n<step label="Configure">\nEdit config.\n</step>\n</steps>'
    );
    const node = firstBlock(blocks);
    expect(isSteps(node)).toBe(true);

    const stepNodes = jsxChildren(node as MdxJsxFlowElement, 'Step');
    expect(stepNodes).toHaveLength(2);
    expect(stepNodes.every(isStep)).toBe(true);
    expect(labelOf(stepNodes[0])).toBe('Install');
    expect(labelOf(stepNodes[1])).toBe('Configure');

    // Install step content survives: the word `Run` and an inlineCode `npm i`.
    const installJson = JSON.stringify(stepNodes[0]);
    expect(installJson).toContain('Run');
    expect(installJson).toContain('"inlineCode"');
    expect(installJson).toContain('npm i');

    // No raw lowercase marker text remains anywhere.
    expect(JSON.stringify(blocks)).not.toContain('<step');
  });
});

describe('containers — <tabs>/<tab> in prose markdown', () => {
  it('converts <tabs> into a Tabs node with two labelled Tab children, each a code block', () => {
    const blocks = markdownToMdastBlocks(
      '<tabs>\n<tab label="npm">\n```sh\nnpm install\n```\n</tab>\n<tab label="pnpm">\n```sh\npnpm add\n```\n</tab>\n</tabs>'
    );
    const node = firstBlock(blocks);
    expect(isTabs(node)).toBe(true);

    const tabNodes = jsxChildren(node as MdxJsxFlowElement, 'Tab');
    expect(tabNodes).toHaveLength(2);
    expect(tabNodes.every(isTab)).toBe(true);
    expect(labelOf(tabNodes[0])).toBe('npm');
    expect(labelOf(tabNodes[1])).toBe('pnpm');

    // Each tab carries a code block with lang `sh`.
    for (const tabNode of tabNodes) {
      const codeNode = tabNode.children.find((c) => c.type === 'code');
      expect(codeNode).toBeDefined();
      expect((codeNode as { lang?: string }).lang).toBe('sh');
    }
    expect(JSON.stringify(blocks)).not.toContain('<tab');
  });
});

describe('containers — recursion routes inner content through transforms', () => {
  it('a step whose content is a callout yields a Callout node inside the Step', () => {
    const blocks = markdownToMdastBlocks(
      '<steps>\n<step label="Tip">\n> [!TIP]\n> hi\n</step>\n</steps>'
    );
    const node = firstBlock(blocks);
    expect(isSteps(node)).toBe(true);
    const stepNodes = jsxChildren(node as MdxJsxFlowElement, 'Step');
    expect(stepNodes).toHaveLength(1);
    // Proves the item content was routed back through the public converter, whose
    // plain segment applied the blockquote→callout transform.
    expect(stepNodes[0].children.some(isCallout)).toBe(true);
  });
});

describe('containers — no containers leaves prose untouched', () => {
  it('a doc with no <steps>/<tabs> has no Steps/Tabs nodes and keeps its prose', () => {
    const blocks = markdownToMdastBlocks('# Heading\n\nSome **prose** here.\n');
    const json = JSON.stringify(blocks);
    expect(blocks.some(isSteps)).toBe(false);
    expect(blocks.some(isTabs)).toBe(false);
    expect(json).toContain('Heading');
    expect(json).toContain('prose');
  });
});

describe('containers — end-to-end through buildDocPages', () => {
  it('emits <Steps>/<Step label="Install"> in the MDX body, no lowercase <steps> tag', () => {
    const docs: DocInput[] = [
      {
        path: 'guide',
        type: 'markdown',
        content:
          '# Guide\n\n<steps>\n<step label="Install">\nRun `npm i`.\n</step>\n<step label="Configure">\nEdit config.\n</step>\n</steps>\n',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    const body = pages[0].body;
    expect(body).toContain('<Steps>');
    expect(body).toContain('<Step label="Install">');
    expect(body).toContain('npm i');
    expect(body).toContain('Edit config.');
    // The raw lowercase authoring tag must not survive into the body.
    expect(body).not.toContain('<steps>');
  });
});
