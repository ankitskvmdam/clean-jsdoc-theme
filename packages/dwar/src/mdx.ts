/**
 * Compile an MDX string into a Preact component.
 *
 * Uses `@mdx-js/mdx`'s `evaluate()` against the preact jsx-runtime so the
 * resulting `MDXContent` is a Preact component the caller can render via
 * `preact-render-to-string`.
 */

import { evaluate } from '@mdx-js/mdx';
import type { ComponentType } from 'preact';
import { h, Fragment } from 'preact';
import { jsx, jsxs } from 'preact/jsx-runtime';
import remarkFrontmatter from 'remark-frontmatter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export interface MdxComponentMap {
  [key: string]: AnyComponent;
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

export async function compileMdxToComponent(
  source: string,
  components: MdxComponentMap,
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
  });

  const MDXContent = mod.default as AnyComponent;

  function Wrapped() {
    return h(MDXContent, { components });
  }
  (Wrapped as { displayName?: string }).displayName = 'MDXContent';

  return { Component: Wrapped as AnyComponent };
}
