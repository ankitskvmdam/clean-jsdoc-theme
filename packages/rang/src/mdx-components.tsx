/**
 * The MDX element → component registry. Maps intrinsic element names that MDX
 * emits (`h1`, `pre`, `code`, `table`, …) onto their renderers:
 *   - plain tags + `makeHeading`        → ./components/mdx-tags, ./components/mdx-utils
 *   - block code (`pre`) + inline `code` → ./components/CodeBlock
 *
 * dwar passes this map to compiled MDX content; consumers can override
 * individual keys via `ComponentOverrides.mdxComponents`.
 */

import type { ComponentType } from 'preact';
import { makeHeading } from './components/mdx-utils';
import { CodeBlock as MdxPre, Code as MdxCode } from './components/CodeBlock';
import { Embed } from './components/Embed';
import { Playground } from './components/Playground';
import { Steps, Step } from './components/Steps';
import { Tabs, Tab } from './components/Tabs';
import {
  MdxH1,
  MdxA,
  MdxImg,
  MdxP,
  MdxUl,
  MdxOl,
  MdxLi,
  MdxBlockquote,
  MdxHr,
  MdxTable,
  MdxThead,
  MdxTbody,
  MdxTr,
  MdxTh,
  MdxTd,
  SourceLink,
  MemberMeta,
  MemberHeading,
} from './components/mdx-tags';

// MDX is a heterogeneous element-name → component map; per-key prop shapes vary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultMdxComponents: Record<string, ComponentType<any>> = {
  h1: MdxH1,
  h2: makeHeading('h2'),
  h3: makeHeading('h3'),
  h4: makeHeading('h4'),
  h5: makeHeading('h5'),
  h6: makeHeading('h6'),
  a: MdxA,
  // Base-path-prefixes a root-relative image `src` (e.g. a copied doc asset) so
  // it resolves under a sub-path deploy; absolute/data srcs pass through.
  img: MdxImg,
  pre: MdxPre,
  code: MdxCode,
  p: MdxP,
  ul: MdxUl,
  ol: MdxOl,
  li: MdxLi,
  blockquote: MdxBlockquote,
  // setu emits typed callouts (e.g. `@deprecated`) as `<Callout type="…">`.
  // Capitalized so MDX routes it through this map; same component as the plain
  // markdown blockquote, which branches to callout styling when `type` is set.
  Callout: MdxBlockquote,
  // setu emits iframe embeds (`@iframe` tag / ```` ```iframe ```` fence) as a
  // self-closing `<Embed src="…" …/>`. Capitalized so MDX routes it here; the
  // component renders the `data-island="embed"` marker dwar's loader hydrates.
  Embed,
  // setu emits a playground-enabled code block as `<Playground providers …>`
  // wrapping a fenced `code` (the `@playground` tag / prose fence / <playground>
  // container). Capitalized so MDX routes it here; the component is an SSR-only
  // context carrier — the nested CodeBlock reads it for the filename header,
  // line highlight, and the "Open Code in" dropdown.
  Playground,
  // setu emits the per-member/class "Source: file:line" caption as
  // `<SourceLink href="…" label="…" />`. Capitalized so MDX routes it here; the
  // component renders a small 12px muted caption with a `file:line` link.
  SourceLink,
  // setu emits the per-member meta row as `<MemberMeta badges sourceHref
  // sourceLabel />` under the member's heading: chips left, filename:line
  // source pinned right. Capitalized so MDX routes it here.
  MemberMeta,
  // setu emits each member heading as `<MemberHeading id depth name sig />` —
  // an h{depth} whose content is one <code> showing the full signature, with an
  // explicit id so the anchor stays clean. Capitalized so MDX routes it here.
  MemberHeading,
  // setu emits a numbered stepper as `<Steps>` wrapping `<Step label="…">`
  // children. Capitalized so MDX routes them here; `Steps` is SSR-only static
  // markup (no island), and `Step` is a logical marker `Steps` reads directly.
  Steps,
  Step,
  // setu emits a tabbed view as `<Tabs>` wrapping `<Tab label="…">` children.
  // Capitalized so MDX routes them here; `Tabs` SSR-renders the full
  // `data-island="tabs"` ARIA tablist + panels that dwar's loader ENHANCES (not
  // hydrates — the panel content is arbitrary SSR HTML), and `Tab` is a marker.
  Tabs,
  Tab,
  hr: MdxHr,
  table: MdxTable,
  thead: MdxThead,
  tbody: MdxTbody,
  tr: MdxTr,
  th: MdxTh,
  td: MdxTd,
};
