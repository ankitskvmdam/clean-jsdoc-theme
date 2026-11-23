import { describe, it, expect } from 'vitest';
import { remarkLiteralExpressions } from '../mdx-literal';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** An expression node the way MDX parses it: its code in `value`, its program in `data.estree`. */
function expression(type: string, value: string, statements = 1): any {
  return {
    type,
    value,
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: Array.from({ length: statements }, () => ({ type: 'ExpressionStatement' })),
      },
    },
  };
}

const paragraph = (...children: any[]): any => ({ type: 'paragraph', children });
const text = (value: string): any => ({ type: 'text', value });
const run = (tree: any): any => {
  remarkLiteralExpressions()(tree);
  return tree;
};

describe('remarkLiteralExpressions', () => {
  it('shows an expression in text as the text it was written as', () => {
    const tree = run({
      type: 'root',
      children: [paragraph(text('a '), expression('mdxTextExpression', '1+2'), text(' b'))],
    });
    expect(tree.children[0].children).toEqual([text('a '), text('{1+2}'), text(' b')]);
  });

  it('shows an expression on a line of its own as a paragraph of text', () => {
    const tree = run({ type: 'root', children: [expression('mdxFlowExpression', 'a\n+ b')] });
    expect(tree.children).toEqual([paragraph(text('{a\n+ b}'))]);
  });

  it('reaches expressions nested in other nodes', () => {
    const tree = run({
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            paragraph({ type: 'emphasis', children: [expression('mdxTextExpression', 'x')] }),
            {
              type: 'mdxJsxFlowElement',
              name: 'Callout',
              attributes: [],
              children: [expression('mdxFlowExpression', 'y')],
            },
          ],
        },
      ],
    });
    const [quoted, callout] = tree.children[0].children;
    expect(quoted.children[0].children).toEqual([text('{x}')]);
    expect(callout.children).toEqual([paragraph(text('{y}'))]);
  });

  it('keeps an expression that holds only comments or whitespace (it renders nothing)', () => {
    const empty = expression('mdxTextExpression', '', 0);
    const comment = expression('mdxTextExpression', '/**/', 0);
    const spaced = expression('mdxFlowExpression', '\n  ', 0);
    const tree = run({ type: 'root', children: [paragraph(empty, comment), spaced] });
    expect(tree.children[0].children[0]).toBe(empty);
    expect(tree.children[0].children[1]).toBe(comment);
    expect(tree.children[1]).toBe(spaced);
  });

  it('turns an attribute expression into a string and drops a spread attribute', () => {
    const element: any = {
      type: 'mdxJsxTextElement',
      name: 'x1',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'a', value: 'plain' },
        {
          type: 'mdxJsxAttribute',
          name: 'b',
          value: { type: 'mdxJsxAttributeValueExpression', value: '1+2', data: {} },
        },
        { type: 'mdxJsxExpressionAttribute', value: '...c', data: {} },
        { type: 'mdxJsxAttribute', name: 'd', value: null },
      ],
      children: [],
    };
    run({ type: 'root', children: [paragraph(element)] });
    expect(element.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'a', value: 'plain' },
      { type: 'mdxJsxAttribute', name: 'b', value: '{1+2}' },
      { type: 'mdxJsxAttribute', name: 'd', value: null },
    ]);
  });

  it('shows an import or export block as a paragraph of text', () => {
    const tree = run({
      type: 'root',
      children: [{ type: 'mdxjsEsm', value: 'export const a = 1', data: { estree: null } }],
    });
    expect(tree.children).toEqual([paragraph(text('export const a = 1'))]);
  });

  it('leaves a tree without expressions as it is', () => {
    const before = {
      type: 'root',
      children: [
        paragraph(text('a '), { type: 'inlineCode', value: '{x}' }),
        { type: 'code', value: '{y}' },
        {
          type: 'mdxJsxFlowElement',
          name: 'Callout',
          attributes: [{ type: 'mdxJsxAttribute', name: 'type', value: 'note' }],
          children: [paragraph(text('b'))],
        },
      ],
    };
    expect(run(structuredClone(before))).toEqual(before);
  });
});
