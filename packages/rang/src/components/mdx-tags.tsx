/**
 * MDX element renderers for the plain HTML tags MDX emits: headings, links,
 * paragraphs, lists, blockquotes, rules, and tables. Code (`pre` / `code`) is
 * handled by `./CodeBlock`. Assembled into `defaultMdxComponents` by
 * `../mdx-components`.
 */

import { CircleAlert, Info, TriangleAlert } from 'lucide-preact';
import type { BaseProps, HeadingProps } from './mdx-utils';
import { HeadingAnchor } from './mdx-utils';

export function MdxH1({ id, children, ...rest }: HeadingProps) {
  return (
    <h1
      id={id}
      class={`group relative mb-4 scroll-mt-20 text-3xl font-medium ${id ? 'cursor-pointer' : ''}`}
      {...rest}
    >
      {id && <HeadingAnchor />}
      {children}
    </h1>
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
  // Simple heuristic for external links: protocol-prefixed URLs target a new tab.
  const isExternal = !!href && /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" class={MDX_LINK_CLASS} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} class={MDX_LINK_CLASS} {...rest}>
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
 * Callout variants. Standard info/warning/error palette built from Tailwind's
 * default colors: a `type`-less blockquote stays a plain muted quote; a typed
 * one (emitted by setu as `<blockquote type="…">`, e.g. `@deprecated`) renders
 * as a callout with a full border in the dark shade, a light tinted background,
 * matching text color, and a leading icon (lucide icons inherit `currentColor`,
 * so they pick up the same color as the text and border).
 */
type CalloutType = 'info' | 'warning' | 'error';

const CALLOUTS: Record<CalloutType, { Icon: typeof Info; cls: string }> = {
  info: {
    Icon: Info,
    cls: 'border-blue-700 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300',
  },
  warning: {
    Icon: TriangleAlert,
    cls: 'border-amber-700 bg-amber-50 text-amber-800 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300',
  },
  error: {
    Icon: CircleAlert,
    cls: 'border-red-700 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950/40 dark:text-red-300',
  },
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

  const { Icon, cls } = callout;
  return (
    <blockquote
      class={`my-4 mx-0 flex gap-3 rounded-md border px-4 py-3 ${cls}`}
      role="note"
      {...rest}
    >
      <Icon size={20} class="mt-0.5 shrink-0" aria-hidden="true" />
      <div class="min-w-0 *:first:mt-0 *:last:mb-0">{children}</div>
    </blockquote>
  );
}

export function MdxHr(props: BaseProps) {
  return <hr class="my-6 border-t border-(--clean-border)" {...props} />;
}

export function MdxTable({ children, ...rest }: BaseProps) {
  return (
    <div class="my-4 overflow-x-auto">
      <table class="w-full border-collapse border border-(--clean-border) text-sm" {...rest}>
        {children}
      </table>
    </div>
  );
}

export function MdxThead({ children, ...rest }: BaseProps) {
  return (
    <thead class="bg-(--clean-bg-muted)" {...rest}>
      {children}
    </thead>
  );
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
    <th class="border border-(--clean-border) px-3 py-2 text-left font-semibold" {...rest}>
      {children}
    </th>
  );
}

export function MdxTd({ children, ...rest }: BaseProps) {
  return (
    <td class="border border-(--clean-border) px-3 py-2" {...rest}>
      {children}
    </td>
  );
}
