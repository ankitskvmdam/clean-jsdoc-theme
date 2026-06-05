/**
 * MDX element renderers for the plain HTML tags MDX emits: headings, links,
 * paragraphs, lists, blockquotes, rules, and tables. Code (`pre` / `code`) is
 * handled by `./CodeBlock`. Assembled into `defaultMdxComponents` by
 * `../mdx-components`.
 */

import type { BaseProps, HeadingProps } from './mdx-utils';

export function MdxH1({ id, children, ...rest }: HeadingProps) {
  return (
    <h1 id={id} class="mb-4 text-3xl font-medium" {...rest}>
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

export function MdxBlockquote({ children, ...rest }: BaseProps) {
  return (
    <blockquote
      class="my-4 border-l-4 border-(--clean-accent) bg-(--clean-bg-muted) px-4 py-2 text-(--clean-fg-muted)"
      {...rest}
    >
      {children}
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
