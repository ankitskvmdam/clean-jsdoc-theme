import type { ComponentChildren, VNode } from 'preact';
import { cloneElement, isValidElement } from 'preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { CopyBtn } from './CopyBtn';
import { PlaygroundMenu } from './PlaygroundMenu';
import { usePlayground } from './Playground';
import { cx, textContent, type BaseProps } from './mdx-utils';

interface CodeVNodeProps {
  children?: ComponentChildren;
  className?: unknown;
  class?: unknown;
  style?: unknown;
}

export interface CodeBlockProps {
  /** Raw code as a string — standalone / `CodeTabs` use. */
  code?: string;
  /** Language hint → `language-*` class on `<code>` (string-`code` mode only). */
  lang?: string;
  /** Show the hover copy button (default true). */
  showCopy?: boolean;
  /**
   * Wrap in the bordered chrome (default true). Set false when an outer
   * container already provides the border (e.g. `CodeTabs` panels).
   */
  bordered?: boolean;
  /**
   * MDX `pre` mode: `children` is the `<code>` vnode. Shiki (rehype) emits its
   * `shiki …` class + `--shiki-*` inline style on THIS element (the `<pre>`) and
   * the highlighted nodes inside the `<code>`. `className`/`class`/`style` are
   * therefore the pre's own attributes; the code vnode carries the inner nodes.
   */
  children?: ComponentChildren;
  className?: unknown;
  class?: unknown;
  style?: unknown;
}

// Highlighted-line tint — matches the active sidebar item (primary, dark-aware).
const HIGHLIGHT_LINE_CLASS = 'bg-primary/10 dark:bg-primary-light/10';

/**
 * Tint the `highlight`ed lines of a Shiki-rendered `<code>`. Shiki wraps each
 * source line in a `<span class="line">` (separated by `"\n"` text nodes), so we
 * count element children and clone the ones whose 1-based index is requested,
 * appending {@link HIGHLIGHT_LINE_CLASS} + a `data-highlighted` marker (dwar's
 * CSS layer can make the tint full-bleed off that attribute). Non-element nodes
 * (the `"\n"` separators) pass through untouched. A no-op when `lines` is empty.
 */
function highlightLines(children: ComponentChildren, lines: readonly number[]): ComponentChildren {
  if (lines.length === 0) return children;
  const want = new Set(lines);
  const nodes = Array.isArray(children) ? children : [children];
  let lineNo = 0;
  return nodes.map((child) => {
    if (!isValidElement(child)) return child;
    lineNo += 1;
    if (!want.has(lineNo)) return child;
    const props = (child as VNode<CodeVNodeProps>).props;
    const existing = cx(props?.class ?? props?.className);
    return cloneElement(child as VNode<Record<string, unknown>>, {
      class: `${existing} ${HIGHLIGHT_LINE_CLASS}`.trim(),
      'data-highlighted': '',
    });
  });
}

/**
 * The single block-code renderer. It is the MDX `pre` component (handles a
 * `<code>` child + Shiki's class/style) and also serves standalone / `CodeTabs`
 * use via a raw `code` string + `lang`. In bordered mode it owns the card + a
 * header bar (a `CODE`/filename label on the left; the copy control and, when a
 * `<Playground>` wrapper supplies providers, the "Open Code in" dropdown on the
 * right). The `copy-btn` / `playground` island markers dwar's loader hydrates
 * live in that header. Unbordered mode (e.g. `CodeTabs` panels) keeps the old
 * borderless body with a floating hover copy button.
 */
export function CodeBlock({
  code,
  lang,
  showCopy = true,
  bordered = true,
  children,
  className,
  class: klass,
  style,
}: CodeBlockProps) {
  const { t } = useTranslation();
  const pg = usePlayground();
  const codeVNode = isValidElement(children) ? (children as VNode<CodeVNodeProps>) : null;

  // Code-less <pre> (rare): render plainly, with no copy button.
  if (children != null && !codeVNode && code == null) {
    return (
      <pre class="my-4 overflow-x-auto rounded-2xl border border-(--clean-border) bg-background p-4 text-sm">
        {children}
      </pre>
    );
  }

  // MDX mode: unwrap the <code> vnode. Standalone mode: use the raw string.
  const rawContent = codeVNode ? codeVNode.props?.children : code;
  const content = codeVNode ? highlightLines(rawContent, pg?.highlight ?? []) : rawContent;
  const codeClass = codeVNode
    ? cx(codeVNode.props?.className ?? codeVNode.props?.class) || undefined
    : lang
      ? `language-${lang}`
      : undefined;
  const preClass = cx(className ?? klass);
  const text = codeVNode ? textContent(children) : (code ?? '');

  const pre = (
    <pre
      class={`m-0 overflow-x-auto p-4 text-sm leading-relaxed ${preClass}`.trimEnd()}
      style={style as never}
      tabIndex={0}
    >
      <code class={codeClass}>{content}</code>
    </pre>
  );

  // Unbordered (e.g. CodeTabs panels): keep the borderless body + floating copy
  // button — the outer container owns the chrome, so no header here.
  if (!bordered) {
    return (
      <div class="group relative">
        {showCopy && text && (
          <div
            data-island="copy-btn"
            class="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <CopyBtn text={text} />
          </div>
        )}
        {pre}
      </div>
    );
  }

  const providers = pg?.providers ?? [];
  const label = pg?.filename || t('chrome.code.label');

  return (
    // `data-code-card` lets dwar's island loader find the sibling <pre> for the
    // header's `copy-btn` / `playground` markers (they read the code from it).
    <div
      data-code-card
      class="my-4 overflow-hidden rounded-2xl border border-(--clean-border) bg-background"
    >
      <div class="flex items-center justify-between gap-2 border-b border-(--clean-border) bg-(--clean-bg-muted) px-4 py-2">
        <span class="truncate font-mono text-xs font-medium tracking-wide text-(--clean-fg-muted) uppercase">
          {label}
        </span>
        <div class="flex shrink-0 items-center gap-1">
          {/* `data-island="copy-btn"` marks this for dwar's loader to hydrate;
              the chunk derives `text` from the sibling <pre>, so no props payload. */}
          {showCopy && text && (
            <div data-island="copy-btn">
              <CopyBtn text={text} />
            </div>
          )}
          {/* `data-island="playground"`: the loader reads `data-providers` + the
              sibling <pre> + the page payload, then hydrates PlaygroundMenu. */}
          {providers.length > 0 && (
            <div data-island="playground" data-providers={providers.join(' ')}>
              <PlaygroundMenu providers={providers} />
            </div>
          )}
        </div>
      </div>
      {pre}
    </div>
  );
}

/**
 * Inline `<code>` (MDX `code` element). Block code is handled by `CodeBlock`
 * above (which unwraps the `<code>` child), so this pill styling only ever
 * lands on genuine inline code.
 */
export function Code({ children, ...rest }: BaseProps) {
  return (
    <code class="rounded bg-(--clean-bg-muted) px-1 py-0.5 text-[0.9em]" {...rest}>
      {children}
    </code>
  );
}
