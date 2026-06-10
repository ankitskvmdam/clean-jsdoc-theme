import type { ComponentChildren, VNode } from 'preact';
import { isValidElement } from 'preact';
import { CopyBtn } from './CopyBtn';
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

/**
 * The single block-code renderer. It is the MDX `pre` component (handles a
 * `<code>` child + Shiki's class/style) and also serves standalone / `CodeTabs`
 * use via a raw `code` string + `lang`. Owns the bordered wrapper, the hover
 * copy button, and the `copy-btn` island marker that dwar's loader hydrates.
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
  const content = codeVNode ? codeVNode.props?.children : code;
  const codeClass = codeVNode
    ? cx(codeVNode.props?.className ?? codeVNode.props?.class) || undefined
    : lang
      ? `language-${lang}`
      : undefined;
  const preClass = cx(className ?? klass);
  const text = codeVNode ? textContent(children) : (code ?? '');

  return (
    <div
      class={
        bordered
          ? 'group relative my-4 overflow-hidden rounded-2xl border border-(--clean-border) bg-background'
          : 'group relative'
      }
    >
      {showCopy && text && (
        // `data-island="copy-btn"` marks this for dwar's loader to hydrate. The
        // chunk derives its `text` from the sibling <pre>, so no per-page props
        // payload is needed (unlike the layout islands).
        <div
          data-island="copy-btn"
          class="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <CopyBtn text={text} />
        </div>
      )}
      <pre
        class={`m-0 overflow-x-auto p-4 text-sm leading-relaxed ${preClass}`.trimEnd()}
        style={style as never}
        tabIndex={0}
      >
        <code class={codeClass}>{content}</code>
      </pre>
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
