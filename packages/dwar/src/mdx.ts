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
import remarkGfm from 'remark-gfm';
import { bundledLanguagesInfo } from 'shiki';
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
 * Every shiki-known language id + alias, lowercased. Built once from shiki's
 * `bundledLanguagesInfo` — a small metadata array (ids/aliases/names), NOT the
 * grammars, so reading it is cheap and does not trigger grammar loading. Used to
 * filter the code-fence languages a site actually uses down to the set shiki can
 * highlight (see {@link collectUsedLangs}).
 */
const KNOWN_SHIKI_LANGS: Set<string> = (() => {
  const set = new Set<string>();
  for (const entry of bundledLanguagesInfo) {
    set.add(entry.id.toLowerCase());
    for (const alias of entry.aliases ?? []) set.add(alias.toLowerCase());
  }
  return set;
})();

/**
 * Common documentation languages always loaded for shiki, regardless of what a
 * given build's fence scan turns up. This guarantees the staples (JS/TS/JSX/TSX,
 * JSON/JSON5, HTML/CSS/SCSS, shell, YAML, Markdown, diff) always highlight — a
 * cheap baseline (~a dozen grammars) on top of which {@link collectUsedLangs}
 * adds any other languages a site actually uses.
 */
const COMMON_LANGS: readonly string[] = [
  'js',
  'ts',
  'jsx',
  'tsx',
  'json',
  'json5',
  'html',
  'css',
  'scss',
  'bash',
  'yaml',
  'markdown',
  'diff',
];

/**
 * The shiki language set for a build: the {@link COMMON_LANGS} baseline plus any
 * additional languages found by scanning the page bodies' fenced code blocks.
 * This loads only this curated set (~a dozen-plus grammars) instead of eagerly
 * loading all 235 bundled languages (~4.3s) on the first highlight, while still
 * guaranteeing the common languages always work. Unknown/`text` fences are
 * dropped and fall back to plain text at highlight time.
 */
export function collectUsedLangs(bodies: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (lang: string): void => {
    if (seen.has(lang) || !KNOWN_SHIKI_LANGS.has(lang)) return;
    seen.add(lang);
    out.push(lang);
  };

  // Always include the common documentation languages.
  for (const lang of COMMON_LANGS) add(lang);

  // Then any other language a fence actually uses. Capture the first info-string
  // token after a ``` or ~~~ fence; the rest (e.g. `title="x"` or `{1,3}`) is ignored.
  const fenceRe = /^[ \t]*(?:```|~~~)([A-Za-z0-9_+#-]+)/gm;
  for (const body of bodies) {
    for (const match of body.matchAll(fenceRe)) add(match[1].toLowerCase());
  }
  return out;
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

/**
 * Backslash-escape stray `{` / `}` so MDX doesn't treat them as JS expression
 * delimiters. setu emits plain Markdown plus `<Callout>` JSX elements — it never
 * emits real MDX `{expression}`s — but JSDoc content is full of literal braces
 * (`{namepath}` in `@see`, Mongo-style `{$gt: 1}` operators, object literals in
 * descriptions). Left raw, a single `{...}` aborts the whole page compile
 * ("Could not parse expression with acorn" / "Unexpected lazy line in
 * expression in container").
 *
 * Braces inside code (fenced blocks + inline spans) and the YAML frontmatter are
 * left untouched — MDX doesn't parse expressions there, and escaping would leak
 * visible backslashes. Run this AFTER {@link preprocessJsdocInlineTags} so the
 * inline-code spans it produces for `{@link}` are protected here.
 *
 * The inline-code matcher mirrors CommonMark's rule that a code span **cannot
 * contain a blank line** (a code span lives within one paragraph). This matters
 * on a big aggregated page (e.g. Globals): a single unbalanced backtick in one
 * doc comment must not pair with a far-away backtick in another, swallowing
 * everything between as "code" and leaving its braces un-escaped — MDX, which
 * stops a code span at the blank line, would then read those braces as a JS
 * expression and abort the page (issue #333, dwv `splitKeyValueString`). So a
 * stray backtick that has no equal-length partner before the next blank line is
 * left literal, and the braces around it are escaped like any other prose.
 */
export function escapeStrayBraces(source: string): string {
  // Keep leading YAML frontmatter verbatim (braces there are YAML, not MDX).
  const fm = /^---\n[\s\S]*?\n---\n/.exec(source);
  const prefix = fm ? fm[0] : '';
  const body = fm ? source.slice(fm[0].length) : source;

  // Single scan: a fenced code block, OR an inline code span, OR a lone brace.
  // Code matches pass through; lone braces get escaped. The inline-code content
  // `(?:[^\n]|\n(?![ \t\r]*\n))*?` allows single line breaks (CommonMark code
  // spans may span lines) but never a blank line — so an unclosed backtick can't
  // run past a paragraph break and mis-swallow another comment's braces.
  const re =
    /(```[\s\S]*?```|~~~[\s\S]*?~~~)|(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?\2|([{}])/g;
  const escaped = body.replace(re, (m, _fence, _ticks, brace) => (brace ? `\\${brace}` : m));
  return prefix + escaped;
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
 * h1 handling mirrors setu's adaptive rule (see `extractHeadings`): we first
 * count the page's h1s. A lone h1 is the page title — kept out of the TOC, so
 * it gets a standalone slug that does NOT touch the shared registry and the
 * h2..h6 numbering stays identical to setu's. But two or more h1s means the
 * author uses h1 as section structure, so they join the registry like any other
 * heading — exactly as setu does. Headings that already carry an explicit `id`
 * are left untouched.
 */
function rehypeSlugHeadings() {
  return (tree: HastNode): void => {
    let h1Count = 0;
    for (const node of tree.children ?? []) {
      if (node.type === 'element' && node.tagName === 'h1') h1Count++;
    }
    const includeH1 = h1Count >= 2;

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
      props.id = depth === 1 && !includeH1 ? slugifyHeading(text) : slugifyHeading(text, registry);
    }
  };
}

export async function compileMdxToComponent(
  source: string,
  components: MdxComponentMap,
  shiki: ShikiThemes,
  langs: readonly string[]
): Promise<CompiledMdx> {
  const cleaned = escapeStrayBraces(preprocessJsdocInlineTags(source));
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
    // Setu prepends YAML frontmatter to the body string. Without remarkFrontmatter,
    // MDX parses the `---` lines as thematic breaks and the YAML keys as
    // paragraph text, leaking raw frontmatter into the rendered output. remarkGfm
    // adds tables / strikethrough / task-lists / autolinks — common in README and
    // tutorial Markdown, and rendered by rang's MDX component map.
    remarkPlugins: [remarkFrontmatter, remarkGfm],
    // Syntax highlighting at compile time. Shiki keeps render() pure (it loads
    // grammars/themes from bundled JS — no fs, no network) while emitting
    // meaningful SSR HTML. Dual themes encode both palettes into CSS variables:
    // light colors apply inline; `[data-theme="dark"]` CSS (see css.ts /
    // tailwind.css base layer) swaps to the `--shiki-dark*` vars, staying in
    // sync with the theme toggle. Unknown / langless fences fall back to plain
    // text so an unrecognised `@example` language never throws mid-render.
    //
    // `langs` is the curated set of languages the site actually uses (see
    // `collectUsedLangs`). Without it, rehype-shiki eagerly loads ALL 235
    // bundled grammars on the first highlight — ~4.3s, the dominant cost of the
    // render stage. Passing only the used languages collapses that to ~150ms
    // with zero fidelity loss: every fence in use is still highlighted, and
    // unknown ones fall back to plain text via `fallbackLanguage` as before.
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
          langs: [...langs],
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
