/**
 * Compile an MDX string into a Preact component.
 *
 * Uses `@mdx-js/mdx`'s `evaluate()` against the preact jsx-runtime so the
 * resulting `MDXContent` is a Preact component the caller can render via
 * `preact-render-to-string`.
 */

import { evaluate } from '@mdx-js/mdx';
import rehypeShiki from '@shikijs/rehype';
import type { ComponentType } from 'preact';
import { h, Fragment } from 'preact';
import { jsx, jsxs } from 'preact/jsx-runtime';
import remarkFrontmatter from 'remark-frontmatter';
import { slugifyHeading } from '@clean-jsdoc-theme/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export interface MdxComponentMap {
  [key: string]: AnyComponent;
}

/** Light/dark Shiki theme names, sourced from `ThemeTokens.shiki`. */
export interface ShikiThemes {
  light: string;
  dark: string;
}

export interface CompiledMdx {
  Component: AnyComponent;
}

/**
 * Pre-process a setu-emitted MDX string so MDX's expression parser doesn't
 * choke on JSDoc inline tags. Setu's TODO lists `{@link Foo}` URL resolution
 * as a deferred pass — meanwhile, the literal text `{@link Foo}` inside MDX
 * looks like a JS expression starting with `@`, which acorn rejects.
 *
 * Cheapest robust fix: convert `{@tag arg}` segments into inline code spans
 * (` `@tag arg` `). Round-trips visually until the real link pass lands.
 */
export function preprocessJsdocInlineTags(source: string): string {
  return source.replace(/\{@([a-zA-Z][a-zA-Z0-9]*)([^{}]*)\}/g, (_m, tag, rest) => {
    const text = `@${tag}${rest}`.trim();
    // Use a markdown inline code span; escape backticks inside the text by
    // bumping the fence width.
    const ticks = text.includes('`') ? '``' : '`';
    return `${ticks}${text}${ticks}`;
  });
}

/** Minimal hast shape — enough to walk headings without pulling in @types/hast. */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** Concatenate the visible text of a hast node (recursively). */
function hastText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (!node.children) return '';
  return node.children.map(hastText).join('');
}

/**
 * Assign slugified `id`s to heading elements so the rendered anchors line up
 * 1:1 with the TOC entries setu emitted. This MIRRORS setu's `extractHeadings`
 * exactly: same `slugifyHeading`, same per-page registry, same top-level
 * h2..h6 walk in document order — that identical sequence is what keeps the
 * duplicate-dedup numbering (`-1`, `-2`, …) in sync, so every `#id` the TOC
 * links to resolves to a real element.
 *
 * h1 (the page title) is not in the TOC; it gets a standalone slug that does
 * NOT touch the shared registry, so the h2..h6 numbering stays identical to
 * setu's. Headings that already carry an explicit `id` are left untouched.
 */
function rehypeSlugHeadings() {
  return (tree: HastNode): void => {
    const registry = new Map<string, number>();
    for (const node of tree.children ?? []) {
      if (node.type !== 'element' || !node.tagName) continue;
      const match = /^h([1-6])$/.exec(node.tagName);
      if (!match) continue;
      const props = node.properties ?? (node.properties = {});
      if (typeof props.id === 'string' && props.id) continue;
      const text = hastText(node).trim();
      if (!text) continue;
      const depth = Number(match[1]);
      props.id = depth >= 2 ? slugifyHeading(text, registry) : slugifyHeading(text);
    }
  };
}

export async function compileMdxToComponent(
  source: string,
  components: MdxComponentMap,
  shiki: ShikiThemes,
): Promise<CompiledMdx> {
  const cleaned = preprocessJsdocInlineTags(source);
  // The MDX `evaluate` runtime types target the React jsx-runtime signature;
  // Preact's runtime is shape-compatible at runtime but the structural types
  // diverge enough that we use `unknown` plus a cast at the call site.
  const mod = await evaluate(cleaned, {
    jsx: jsx as never,
    jsxs: jsxs as never,
    Fragment: Fragment as never,
    development: false,
    // No provider: we pass components directly to MDXContent below.
    useMDXComponents: undefined,
    // Setu prepends YAML frontmatter to the body string. Without this plugin,
    // MDX parses the `---` lines as thematic breaks and the YAML keys as
    // paragraph text, leaking raw frontmatter into the rendered output.
    remarkPlugins: [remarkFrontmatter],
    // Syntax highlighting at compile time. Shiki keeps render() pure (it loads
    // grammars/themes from bundled JS — no fs, no network) while emitting
    // meaningful SSR HTML. Dual themes encode both palettes into CSS variables:
    // light colors apply inline; `[data-theme="dark"]` CSS (see css.ts /
    // tailwind.css base layer) swaps to the `--shiki-dark*` vars, staying in
    // sync with the theme toggle. Unknown / langless fences fall back to plain
    // text so an unrecognised `@example` language never throws mid-render.
    rehypePlugins: [
      // Heading ids first, so they're set before Shiki rewrites code subtrees
      // (headings carry no code, but order keeps the pass independent).
      rehypeSlugHeadings,
      [
        rehypeShiki,
        {
          themes: { light: shiki.light, dark: shiki.dark },
          defaultColor: 'light',
          defaultLanguage: 'text',
          fallbackLanguage: 'text',
        },
      ],
    ],
  });

  const MDXContent = mod.default as AnyComponent;

  function Wrapped() {
    return h(MDXContent, { components });
  }
  (Wrapped as { displayName?: string }).displayName = 'MDXContent';

  return { Component: Wrapped as AnyComponent };
}
