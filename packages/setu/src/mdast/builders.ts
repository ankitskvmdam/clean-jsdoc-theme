import type {
  BlockContent,
  Code,
  DefinitionContent,
  Emphasis,
  Heading,
  Html,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
  ThematicBreak,
} from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { EmbedSpec } from '../embed';

export const text = (value: string): Text => ({ type: 'text', value });

export const inlineCode = (value: string): InlineCode => ({ type: 'inlineCode', value });

export const strong = (...children: PhrasingContent[]): Strong => ({
  type: 'strong',
  children,
});

export const emphasis = (...children: PhrasingContent[]): Emphasis => ({
  type: 'emphasis',
  children,
});

export const link = (url: string, ...children: PhrasingContent[]): Link => ({
  type: 'link',
  url,
  children: children.length ? children : [text(url)],
});

export const p = (...children: PhrasingContent[]): Paragraph => ({
  type: 'paragraph',
  children,
});

export const h = (depth: 1 | 2 | 3 | 4 | 5 | 6, ...children: PhrasingContent[]): Heading => ({
  type: 'heading',
  depth,
  children,
});

export const code = (lang: string | null, value: string): Code => ({
  type: 'code',
  lang,
  value,
});

export const hr = (): ThematicBreak => ({ type: 'thematicBreak' });

export const html = (value: string): Html => ({ type: 'html', value });

export const li = (...children: ListItem['children']): ListItem => ({
  type: 'listItem',
  spread: false,
  children,
});

export const ul = (items: ListItem[]): List => ({
  type: 'list',
  ordered: false,
  spread: false,
  children: items,
});

export const ol = (items: ListItem[]): List => ({
  type: 'list',
  ordered: true,
  spread: false,
  children: items,
});

export const root = (...children: RootContent[]): Root => ({ type: 'root', children });

/**
 * A callout — rang's `MdxBlockquote` rendered with a `type` variant, emitted as
 * an MDX JSX element (`<Callout type="…">`) rather than a markdown `>` quote.
 * The attribute is what a plain markdown blockquote can't express:
 * `mdast-util-to-markdown` drops the `data` field, so the variant would never
 * reach the renderer. As MDX JSX it round-trips through serialization (see the
 * `mdxJsxToMarkdown` wiring in `mdx.ts`) and arrives as a prop.
 *
 * The name is capitalized on purpose: MDX routes only capitalized JSX names
 * through the `components` map (lowercase literal JSX renders as a raw host
 * element, bypassing the map). rang registers `Callout` → `MdxBlockquote`, so
 * the rendered element is still a `<blockquote>`.
 */
export const callout = (
  variant: 'info' | 'warning' | 'error',
  children: (BlockContent | DefinitionContent)[]
): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'Callout',
  attributes: [{ type: 'mdxJsxAttribute', name: 'type', value: variant }],
  children,
});

/**
 * An embed — rang's `Embed` island emitted as an MDX JSX element
 * (`<Embed src="…" />`). Like `callout`, the capitalized name routes it through
 * the `components` map, and `mdxJsxToMarkdown` (wired in `mdx.ts`) serializes the
 * attributes verbatim. Self-closing (no children).
 *
 * Each defined `EmbedSpec` field becomes one string-valued `mdxJsxAttribute`;
 * numbers and booleans are stringified (`height="400"`, `clickToLoad="true"`),
 * and `undefined` fields are omitted so the renderer can apply its defaults.
 */
export const embed = (spec: EmbedSpec): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  const attr = (name: string, value: string | number | boolean | undefined): void => {
    if (value === undefined) return;
    attributes.push({ type: 'mdxJsxAttribute', name, value: String(value) });
  };

  attr('src', spec.src);
  attr('title', spec.title);
  attr('height', spec.height);
  attr('width', spec.width);
  attr('aspectRatio', spec.aspectRatio);
  attr('allow', spec.allow);
  attr('sandbox', spec.sandbox);
  attr('clickToLoad', spec.clickToLoad);
  attr('themed', spec.themed);

  return {
    type: 'mdxJsxFlowElement',
    name: 'Embed',
    attributes,
    children: [],
  };
};
