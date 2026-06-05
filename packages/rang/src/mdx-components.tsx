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
import {
  MdxH1,
  MdxA,
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
  pre: MdxPre,
  code: MdxCode,
  p: MdxP,
  ul: MdxUl,
  ol: MdxOl,
  li: MdxLi,
  blockquote: MdxBlockquote,
  hr: MdxHr,
  table: MdxTable,
  thead: MdxThead,
  tbody: MdxTbody,
  tr: MdxTr,
  th: MdxTh,
  td: MdxTd,
};
