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
  variant: 'info' | 'tip' | 'warning' | 'error',
  children: (BlockContent | DefinitionContent)[]
): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'Callout',
  attributes: [{ type: 'mdxJsxAttribute', name: 'type', value: variant }],
  children,
});

/**
 * A numbered stepper — rang's `Steps` emitted as an MDX JSX element
 * (`<Steps>` wrapping `<Step>` children). Like `callout`, the capitalized name
 * routes it through the `components` map (rang registers `Steps` → its SSR-only
 * stepper), and `mdxJsxToMarkdown` (wired in `mdx.ts`) serializes it so the prose
 * authoring tags survive into the compiled MDX.
 */
export const steps = (children: (BlockContent | DefinitionContent)[]): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'Steps',
  attributes: [],
  children,
});

/**
 * A single step — rang's `Step` emitted as an MDX JSX element
 * (`<Step label="…">`). Capitalized so MDX routes it through the `components`
 * map (rang registers `Step` as the marker `Steps` reads). The optional `label`
 * becomes one `mdxJsxAttribute`, included only when it is a non-empty string so
 * the renderer can omit the heading when none was authored.
 */
export const step = (
  label: string | undefined,
  children: (BlockContent | DefinitionContent)[]
): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  if (label) attributes.push({ type: 'mdxJsxAttribute', name: 'label', value: label });
  return { type: 'mdxJsxFlowElement', name: 'Step', attributes, children };
};

/**
 * A tabbed view — rang's `Tabs` emitted as an MDX JSX element (`<Tabs>` wrapping
 * `<Tab>` children). Like `callout`, the capitalized name routes it through the
 * `components` map (rang registers `Tabs` → its ARIA tablist), and
 * `mdxJsxToMarkdown` (wired in `mdx.ts`) serializes it so the prose authoring
 * tags survive into the compiled MDX.
 */
export const tabs = (
  children: (BlockContent | DefinitionContent)[],
  group?: string
): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  // `group` opts the block into cross-block sync (see rang's `Tabs`); included
  // only when a non-empty string was authored so ungrouped blocks stay inert.
  if (group) attributes.push({ type: 'mdxJsxAttribute', name: 'group', value: group });
  return { type: 'mdxJsxFlowElement', name: 'Tabs', attributes, children };
};

/**
 * A single tab — rang's `Tab` emitted as an MDX JSX element (`<Tab label="…">`).
 * Capitalized so MDX routes it through the `components` map (rang registers `Tab`
 * as the marker `Tabs` reads). The optional `label` becomes one `mdxJsxAttribute`,
 * included only when it is a non-empty string (the renderer falls back to
 * `Tab N` otherwise).
 */
export const tab = (
  label: string | undefined,
  children: (BlockContent | DefinitionContent)[],
  value?: string
): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  if (label) attributes.push({ type: 'mdxJsxAttribute', name: 'label', value: label });
  // `value` is the cross-block sync key (see rang's `Tabs`); when omitted the
  // renderer falls back to the normalized label, so it's emitted only when set.
  if (value) attributes.push({ type: 'mdxJsxAttribute', name: 'value', value });
  return { type: 'mdxJsxFlowElement', name: 'Tab', attributes, children };
};

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

/**
 * A code playground — rang's `Playground` context wrapper emitted as an MDX JSX
 * element (`<Playground …>` wrapping a single fenced `code` child). Like
 * `callout`, the capitalized name routes it through the `components` map, and
 * `mdxJsxToMarkdown` (wired in `mdx.ts`) serializes the attributes + re-serializes
 * the code child as a real fence — so Shiki still highlights it and the LLM `.md`
 * keeps a clean fenced block under a small wrapper.
 *
 * Attributes (each omitted when empty): `providers` (space-joined provider ids
 * driving the "Open Code in" dropdown), `filename` (header label), and
 * `highlight` (comma-joined 1-based line numbers).
 */
export const playground = (
  opts: { providers: readonly string[]; filename?: string; highlight?: readonly number[] },
  child: Code
): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  if (opts.providers.length > 0) {
    attributes.push({ type: 'mdxJsxAttribute', name: 'providers', value: opts.providers.join(' ') });
  }
  if (opts.filename) {
    attributes.push({ type: 'mdxJsxAttribute', name: 'filename', value: opts.filename });
  }
  if (opts.highlight && opts.highlight.length > 0) {
    attributes.push({ type: 'mdxJsxAttribute', name: 'highlight', value: opts.highlight.join(',') });
  }
  return { type: 'mdxJsxFlowElement', name: 'Playground', attributes, children: [child] };
};

/**
 * A source-location caption — rang's `SourceLink` emitted as a self-closing MDX
 * JSX element (`<SourceLink href="…" label="…" />`). Capitalized so MDX routes
 * it through the `components` map (same round-trip as `callout`/`embed`); the
 * component owns the markup — a small 12px caption with a `file:line` link —
 * rather than a full-size markdown paragraph.
 */
export const sourceLink = (href: string, label: string): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'SourceLink',
  attributes: [
    { type: 'mdxJsxAttribute', name: 'href', value: href },
    { type: 'mdxJsxAttribute', name: 'label', value: label },
  ],
  children: [],
});

/**
 * A member meta row — rang's `MemberMeta` emitted as a self-closing MDX JSX
 * element (the same capitalized-JSX round-trip as {@link callout}/{@link embed}/
 * {@link sourceLink}). One container under a member's `###` heading: modifier/
 * kind chips on the left, the `filename:line` source link pinned right (empty
 * when the consumer opted out of source files). The heading stays a real ATX
 * heading so its anchor / TOC / search entry survive. Empty fields are omitted.
 */
export const memberMeta = (meta: {
  badges?: readonly string[];
  sourceHref?: string;
  sourceLabel?: string;
}): MdxJsxFlowElement => {
  const attributes: MdxJsxAttribute[] = [];
  const attr = (name: string, value: string | undefined): void => {
    if (value) attributes.push({ type: 'mdxJsxAttribute', name, value });
  };
  attr('badges', meta.badges && meta.badges.length ? meta.badges.join(',') : undefined);
  attr('sourceHref', meta.sourceHref);
  attr('sourceLabel', meta.sourceLabel);
  return { type: 'mdxJsxFlowElement', name: 'MemberMeta', attributes, children: [] };
};

/**
 * A member heading — rang's `MemberHeading` emitted as a self-closing MDX JSX
 * flow element instead of a markdown `###` heading. It renders an `h{depth}`
 * whose entire content is one `<code>` element showing the full signature
 * (`process(data) -> Promise.<number>`), with an **explicit `id`** so the anchor
 * stays clean (`#process`) regardless of the displayed signature.
 *
 * Why a component, not a markdown heading: a markdown heading derives its slug
 * from its visible text, so a signature heading would anchor as
 * `#process-data-promise-number`. Here the `id` is set explicitly and the
 * signature rides in the `sig` attribute (no text at rehype time), so dwar's
 * slug pass skips it. `setu`'s `extractHeadings` recognises this node and emits
 * a TOC/search entry from `name` + `id` (no dedup-registry touch, mirroring the
 * slug pass), so TOC / search / `{@link}` keep resolving to `#name`. Embedded
 * `"` in `sig` is downgraded to `'` so the attribute can't terminate early.
 */
export const memberHeading = (opts: {
  id: string;
  depth: number;
  name: string;
  sig: string;
}): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'MemberHeading',
  attributes: [
    { type: 'mdxJsxAttribute', name: 'id', value: opts.id },
    { type: 'mdxJsxAttribute', name: 'depth', value: String(opts.depth) },
    { type: 'mdxJsxAttribute', name: 'name', value: opts.name },
    { type: 'mdxJsxAttribute', name: 'sig', value: opts.sig.replace(/"/g, "'") },
  ],
  children: [],
});

/**
 * A standalone code signature — rang's `Signature`, emitted as a self-closing
 * MDX JSX flow element. Used where a signature isn't a heading: a top-level
 * function/variable page and each signature of an overloaded member. Like
 * {@link memberHeading} it renders one shiki-highlighted inline `<code>`, but in
 * its own block (no heading, no anchor). Embedded `"` is downgraded to `'` so
 * the attribute can't terminate early.
 */
export const signature = (code: string): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name: 'Signature',
  attributes: [{ type: 'mdxJsxAttribute', name: 'code', value: code.replace(/"/g, "'") }],
  children: [],
});
