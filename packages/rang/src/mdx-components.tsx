import type { ComponentChildren, ComponentType, VNode } from 'preact';
import { isValidElement } from 'preact';
import { CopyBtn } from './components/CopyBtn';

interface BaseProps {
  children?: ComponentChildren;
  // MDX passes through arbitrary HTML-style props; ComponentType<any> at the
  // registry level absorbs that heterogeneity.
  [key: string]: unknown;
}

interface HeadingProps extends BaseProps {
  id?: string;
}

function makeHeading(Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  return function MdxHeading({ id, children, ...rest }: HeadingProps) {
    // Headings render in the heading font at weight 500 (font-medium).
    const headingClass: Record<typeof Tag, string> = {
      h2: 'mt-8 mb-3 text-2xl font-medium',
      h3: 'mt-6 mb-2 text-xl font-medium',
      h4: 'mt-5 mb-2 text-lg font-medium',
      h5: 'mt-4 mb-1 text-base font-medium',
      h6: 'mt-4 mb-1 text-sm font-medium uppercase tracking-wider',
    };
    return (
      <Tag id={id} class={`group scroll-mt-20 ${headingClass[Tag]}`} {...rest}>
        {children}
        {id && (
          <a
            href={`#${id}`}
            aria-hidden="true"
            class="anchor ml-2 text-[var(--clean-fg-muted)] opacity-0 no-underline group-hover:opacity-100"
          >
            #
          </a>
        )}
      </Tag>
    );
  };
}

function MdxH1({ id, children, ...rest }: HeadingProps) {
  return (
    <h1 id={id} class="mt-2 mb-4 text-3xl font-medium" {...rest}>
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
  'font-bold text-[var(--clean-link)] underline decoration-1 underline-offset-2 hover:decoration-2';

function MdxA({ href, children, ...rest }: AnchorProps) {
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

interface CodeChildVNodeProps {
  children?: ComponentChildren;
}

function extractPreText(children: ComponentChildren): string | null {
  if (!isValidElement(children)) return null;
  const vnode = children as VNode<CodeChildVNodeProps>;
  if (vnode.type !== 'code') return null;
  const inner = vnode.props?.children;
  if (typeof inner === 'string') return inner;
  if (Array.isArray(inner) && inner.every((c) => typeof c === 'string')) {
    return inner.join('');
  }
  return null;
}

function MdxPre({ children, ...rest }: BaseProps) {
  const text = extractPreText(children);
  if (text === null) {
    return (
      <pre class="my-4 overflow-x-auto rounded border border-[var(--clean-border)] bg-[var(--clean-bg)] p-3 text-sm" {...rest}>
        {children}
      </pre>
    );
  }
  return (
    <div class="group relative my-4 rounded border border-[var(--clean-border)] bg-[var(--clean-bg)]">
      <div class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyBtn text={text} />
      </div>
      <pre class="m-0 overflow-x-auto p-3 text-sm" {...rest}>
        {children}
      </pre>
    </div>
  );
}

function MdxCode({ children, ...rest }: BaseProps) {
  return (
    <code class="rounded bg-[var(--clean-bg-muted)] px-1 py-0.5 text-[0.9em]" {...rest}>
      {children}
    </code>
  );
}

function MdxP({ children, ...rest }: BaseProps) {
  return (
    <p class="my-3 leading-relaxed" {...rest}>
      {children}
    </p>
  );
}

function MdxUl({ children, ...rest }: BaseProps) {
  return (
    <ul class="my-3 list-disc pl-6" {...rest}>
      {children}
    </ul>
  );
}

function MdxOl({ children, ...rest }: BaseProps) {
  return (
    <ol class="my-3 list-decimal pl-6" {...rest}>
      {children}
    </ol>
  );
}

function MdxLi({ children, ...rest }: BaseProps) {
  return (
    <li class="my-1" {...rest}>
      {children}
    </li>
  );
}

function MdxBlockquote({ children, ...rest }: BaseProps) {
  return (
    <blockquote class="my-4 border-l-4 border-[var(--clean-accent)] bg-[var(--clean-bg-muted)] px-4 py-2 text-[var(--clean-fg-muted)]" {...rest}>
      {children}
    </blockquote>
  );
}

function MdxHr(props: BaseProps) {
  return <hr class="my-6 border-t border-[var(--clean-border)]" {...props} />;
}

function MdxTable({ children, ...rest }: BaseProps) {
  return (
    <div class="my-4 overflow-x-auto">
      <table class="w-full border-collapse border border-[var(--clean-border)] text-sm" {...rest}>
        {children}
      </table>
    </div>
  );
}

function MdxThead({ children, ...rest }: BaseProps) {
  return (
    <thead class="bg-[var(--clean-bg-muted)]" {...rest}>
      {children}
    </thead>
  );
}

function MdxTbody({ children, ...rest }: BaseProps) {
  return <tbody {...rest}>{children}</tbody>;
}

function MdxTr({ children, ...rest }: BaseProps) {
  return (
    <tr class="border-b border-[var(--clean-border)]" {...rest}>
      {children}
    </tr>
  );
}

function MdxTh({ children, ...rest }: BaseProps) {
  return (
    <th class="border border-[var(--clean-border)] px-3 py-2 text-left font-semibold" {...rest}>
      {children}
    </th>
  );
}

function MdxTd({ children, ...rest }: BaseProps) {
  return (
    <td class="border border-[var(--clean-border)] px-3 py-2" {...rest}>
      {children}
    </td>
  );
}

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
