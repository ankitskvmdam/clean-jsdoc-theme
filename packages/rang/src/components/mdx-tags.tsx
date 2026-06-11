/**
 * MDX element renderers for the plain HTML tags MDX emits: headings, links,
 * paragraphs, lists, blockquotes, rules, and tables. Code (`pre` / `code`) is
 * handled by `./CodeBlock`. Assembled into `defaultMdxComponents` by
 * `../mdx-components`.
 */

import { useContext } from 'preact/hooks';
import { CircleAlert, Info, Lightbulb, TriangleAlert } from 'lucide-preact';
import { withBase } from '@clean-jsdoc-theme/utils';
import type { BaseProps, HeadingProps } from './mdx-utils';
import { HeadingAnchor, HeaderRow, useHeaderSlot, BasePathContext } from './mdx-utils';
import { Code } from './CodeBlock';

export function MdxH1({ id, children, ...rest }: HeadingProps) {
  // The first heading on the page claims the header slot (e.g. the copy-page
  // button), which then sits in a row beside the title (see HeaderRow).
  const slot = useHeaderSlot();
  const heading = (
    <h1
      id={id}
      class={`group relative scroll-mt-20 text-3xl font-medium ${slot ? '' : 'mb-4'} ${id ? 'cursor-pointer' : ''}`}
      {...rest}
    >
      {id && <HeadingAnchor />}
      {children}
    </h1>
  );
  if (!slot) return heading;
  return (
    <HeaderRow marginClass="[&_h1]:m-0 mb-4" slot={slot}>
      {heading}
    </HeaderRow>
  );
}

interface AnchorProps extends BaseProps {
  href?: string;
}

// Content links: bold, pure black (light) / white (dark) via --clean-link, with
// a matching underline (currentColor) that thickens slightly on hover.
const MDX_LINK_CLASS =
  'font-bold text-(--clean-link) underline decoration-1 underline-offset-2 hover:decoration-2';

export function MdxA({ href, children, ...rest }: AnchorProps) {
  const basePath = useContext(BasePathContext);
  // Simple heuristic for external links: protocol-prefixed URLs target a new tab.
  const isExternal = !!href && /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" class={MDX_LINK_CLASS} {...rest}>
        {children}
      </a>
    );
  }
  // Root-relative internal link (`/foo`, but NOT a protocol-relative `//host`)
  // gets the base-path prefix. Anything else (relative, `#hash`, `mailto:`,
  // protocol-relative) passes through untouched.
  const isInternal = !!href && href.startsWith('/') && !href.startsWith('//');
  const resolvedHref = isInternal ? withBase(basePath, href) : href;
  return (
    <a href={resolvedHref} class={MDX_LINK_CLASS} {...rest}>
      {children}
    </a>
  );
}

export function MdxP({ children, ...rest }: BaseProps) {
  return (
    <p class="my-3 leading-relaxed" {...rest}>
      {children}
    </p>
  );
}

interface SourceLinkProps {
  href?: string;
  label?: string;
}

/**
 * Source-location caption. setu emits `<SourceLink href="…" label="…" />` — the
 * `Source: file:line` link under a member/class heading — as a capitalized MDX
 * JSX node so it routes through the components map and we own its markup: a
 * small 12px muted caption rather than a full-size body paragraph.
 */
export function SourceLink({ href, label }: SourceLinkProps) {
  const basePath = useContext(BasePathContext);
  if (!href || !label) return null;
  return (
    <p class="my-3 text-xs text-muted-foreground">
      Source:{' '}
      <a href={withBase(basePath, href)} class={MDX_LINK_CLASS}>
        <Code>{label}</Code>
      </a>
    </p>
  );
}

/** Member-heading size classes by tag, mirroring `makeHeading` in mdx-utils. */
const MEMBER_HEADING_CLASS: Record<string, string> = {
  h2: 'mt-8 mb-3 text-2xl font-medium',
  h3: 'mt-6 mb-2 text-xl font-medium',
  h4: 'mt-5 mb-2 text-lg font-medium',
};

/**
 * A member heading emitted by setu as `<MemberHeading id depth name sig />`. It
 * renders an `h{depth}` whose entire content is a single `<code>` showing the
 * full signature (e.g. `process(data) -> Promise.<number>`), so the name and its
 * params/return read as one unit. The `id` is explicit — the displayed
 * signature never feeds the anchor slug (stays `#name`) — and the hover anchor
 * + scroll offset mirror `makeHeading`, so dwar's heading-anchors script and the
 * TOC treat it like any other heading.
 */
export function MemberHeading({ id, depth, sig }: { id?: string; depth?: string; sig?: string }) {
  const tag = depth === '2' ? 'h2' : depth === '4' ? 'h4' : 'h3';
  const Tag = tag as 'h2' | 'h3' | 'h4';
  return (
    <Tag
      id={id}
      class={`group relative scroll-mt-20 ${id ? 'cursor-pointer' : ''} ${MEMBER_HEADING_CLASS[tag]}`}
    >
      {id ? <HeadingAnchor /> : null}
      <Code>{sig}</Code>
    </Tag>
  );
}

interface MemberMetaProps {
  /** Comma-joined modifier/kind badges, e.g. `static,async,deprecated`. */
  badges?: string;
  /** Source viewer href; absent when the consumer opted out of source files. */
  sourceHref?: string;
  /** `filename:line` label for the source link. */
  sourceLabel?: string;
}

/**
 * Single source of truth for chip color + stacking order. Two visual classes:
 *
 * - **Modifier / state chips** — filled, tinted, color-coded by meaning; several
 *   can stack on one symbol. Recipe: `bg-{c}-50 text-{c}-700 border-{c}-200`
 *   light, `dark:bg-{c}-950 dark:text-{c}-300 dark:border-{c}-800` dark
 *   (`readonly` uses the neutral `slate` ramp at `100/600/200` ↔ `800/300/700`).
 * - **Kind markers** (`enum`/`typedef`/`interface`) — neutral *outline* chips
 *   (no fill); exactly one applies, signalling *what a symbol is* vs *how it
 *   behaves*.
 * - **`deprecated`** — a louder *solid red* chip, so it stays distinct even when
 *   stacked beside the red-family `private` chip.
 *
 * Unlisted badges (e.g. `event`) fall back to a neutral muted pill. The
 * `global` modifier is intentionally absent — it is filtered out before render,
 * never chipped.
 */
const CHIP_TINTED: Record<string, string> = {
  // behavior
  async:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  generator:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  // binding
  static:
    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  // mutability (neutral slate ramp)
  readonly:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  // inheritance
  abstract:
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800',
  override:
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
  // access
  public:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  protected:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  private:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
};
const CHIP_DEPRECATED =
  'bg-red-600 text-white border-red-600 dark:bg-red-600 dark:text-white dark:border-red-600';
const CHIP_KIND =
  'bg-transparent text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-600';
const CHIP_FALLBACK = 'border-(--clean-border) bg-(--clean-bg-muted) text-(--clean-fg-muted)';

/** Kind markers — neutral outline chips; exactly one applies per symbol. */
const KIND_MARKERS = new Set(['enum', 'typedef', 'interface']);
/** Access modifiers, grouped together in render order. */
const ACCESS = new Set(['public', 'protected', 'private']);

/** Color classes for a badge, by category. */
function chipClass(badge: string): string {
  if (badge === 'deprecated') return CHIP_DEPRECATED;
  if (KIND_MARKERS.has(badge)) return CHIP_KIND;
  return CHIP_TINTED[badge] ?? CHIP_FALLBACK;
}

/**
 * Stacking rank — kind marker first (outline), then access, then
 * behavior/binding/mutability/inheritance, then `deprecated` last so the loud
 * chip anchors the row. Ties keep input order via a stable sort.
 */
function chipRank(badge: string): number {
  if (KIND_MARKERS.has(badge)) return 0;
  if (ACCESS.has(badge)) return 1;
  if (badge === 'deprecated') return 3;
  return 2;
}

/**
 * Member meta row emitted by setu as `<MemberMeta badges sourceHref sourceLabel
 * />`, rendered directly under a member's heading: modifier/kind chips on the
 * left, the `filename:line` source link pinned right. The left chip group is
 * always rendered (empty when there are no badges) so the source stays
 * right-aligned; the right stays empty when the consumer opted out of source
 * files. Capitalized so MDX routes it through the components map. Renders
 * nothing only when it has neither badges nor a source.
 */
export function MemberMeta({ badges, sourceHref, sourceLabel }: MemberMetaProps) {
  const basePath = useContext(BasePathContext);
  // `global` is never chipped (filtered out, no map entry). Stable-sort the rest
  // into category order so stacked chips read kind → access → behavior → deprecated.
  const list = (badges ? badges.split(',') : [])
    .map((b) => b.trim())
    .filter((b) => b && b !== 'global')
    .map((badge, i) => ({ badge, i }))
    .sort((a, b) => chipRank(a.badge) - chipRank(b.badge) || a.i - b.i)
    .map((x) => x.badge);
  if (list.length === 0 && !sourceHref) return null;
  return (
    <div class="mt-2 mb-3 flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap items-center gap-2">
        {list.map((badge) => (
          <span
            key={badge}
            aria-label={badge}
            class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${chipClass(badge)}`}
          >
            {badge}
          </span>
        ))}
      </div>
      {sourceHref ? (
        <a
          href={withBase(basePath, sourceHref)}
          class="ml-auto font-mono text-xs text-(--clean-fg-muted) underline decoration-1 underline-offset-2 hover:text-(--clean-link)"
        >
          {sourceLabel}
        </a>
      ) : null}
    </div>
  );
}

export function MdxUl({ children, ...rest }: BaseProps) {
  return (
    <ul class="my-3 list-disc pl-6" {...rest}>
      {children}
    </ul>
  );
}

export function MdxOl({ children, ...rest }: BaseProps) {
  return (
    <ol class="my-3 list-decimal pl-6" {...rest}>
      {children}
    </ol>
  );
}

export function MdxLi({ children, ...rest }: BaseProps) {
  return (
    <li class="my-1" {...rest}>
      {children}
    </li>
  );
}

/**
 * Callout variants (info/tip/warning/error). A `type`-less blockquote stays a
 * plain muted quote; a typed one (emitted by setu as `<blockquote type="…">`,
 * e.g. for `@deprecated`, or from a `> [!TIP]` prose alert) renders in a neutral
 * rounded container — the variant is conveyed by a colored leading icon (info
 * blue, tip green, warning amber, error red). lucide icons inherit
 * `currentColor`, so each picks up its `text-*` color below.
 */
type CalloutType = 'info' | 'tip' | 'warning' | 'error';

const CALLOUTS: Record<CalloutType, { Icon: typeof Info; icon: string }> = {
  info: { Icon: Info, icon: 'text-blue-600 dark:text-blue-400' },
  tip: { Icon: Lightbulb, icon: 'text-green-600 dark:text-green-400' },
  warning: { Icon: TriangleAlert, icon: 'text-amber-600 dark:text-amber-400' },
  error: { Icon: CircleAlert, icon: 'text-red-600 dark:text-red-400' },
};

interface BlockquoteProps extends BaseProps {
  /** Callout variant. Absent → a plain muted blockquote. */
  type?: string;
}

export function MdxBlockquote({ type, children, ...rest }: BlockquoteProps) {
  const callout = typeof type === 'string' ? CALLOUTS[type as CalloutType] : undefined;

  if (!callout) {
    return (
      <blockquote
        class="mx-0 my-4 border-l-4 border-(--clean-border) bg-(--clean-bg-muted) px-4 py-2 text-muted-foreground"
        {...rest}
      >
        {children}
      </blockquote>
    );
  }

  const { Icon, icon } = callout;
  return (
    <blockquote
      class="my-4 mx-0 flex gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-white/10"
      role="note"
      {...rest}
    >
      <Icon size={20} class={`mt-0.5 shrink-0 ${icon}`} aria-hidden="true" />
      <div class="min-w-0 *:first:mt-0 *:last:mb-0">{children}</div>
    </blockquote>
  );
}

export function MdxHr(props: BaseProps) {
  return <hr class="my-6 border-t border-(--clean-border)" {...props} />;
}

/*
 * Borderless, row-divider tables (close to the Claude Code docs): no cell grid,
 * the header separated by a single rule, comfortable padding, top-aligned cells
 * so multi-line rows read cleanly, and horizontal scroll for wide tables. A
 * `min-width` per cell keeps columns from collapsing on narrow content.
 */
export function MdxTable({ children, ...rest }: BaseProps) {
  return (
    <div class="my-6 overflow-x-auto">
      <table class="w-full min-w-full border-collapse text-sm [&_td]:min-w-[150px]" {...rest}>
        {children}
      </table>
    </div>
  );
}

export function MdxThead({ children, ...rest }: BaseProps) {
  return <thead {...rest}>{children}</thead>;
}

export function MdxTbody({ children, ...rest }: BaseProps) {
  return <tbody {...rest}>{children}</tbody>;
}

export function MdxTr({ children, ...rest }: BaseProps) {
  return (
    <tr class="border-b border-(--clean-border)" {...rest}>
      {children}
    </tr>
  );
}

export function MdxTh({ children, ...rest }: BaseProps) {
  return (
    <th class="px-4 py-3 text-left align-top font-semibold text-(--clean-fg)" {...rest}>
      {children}
    </th>
  );
}

export function MdxTd({ children, ...rest }: BaseProps) {
  return (
    <td class="px-4 py-3 align-top leading-relaxed text-(--clean-fg-muted)" {...rest}>
      {children}
    </td>
  );
}
