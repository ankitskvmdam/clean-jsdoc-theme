/**
 * Shared utilities for the MDX element renderers: the common prop types, the
 * `makeHeading` factory, and the `cx` / `textContent` helpers. Kept separate
 * from the element renderers (`mdx-tags`) and the code components (`CodeBlock`)
 * so both can import them without a cycle.
 */

import type { ComponentChildren, VNode } from 'preact';
import { isValidElement } from 'preact';

export interface BaseProps {
  children?: ComponentChildren;
  // MDX passes through arbitrary HTML-style props; `unknown` at the registry
  // level absorbs that heterogeneity.
  [key: string]: unknown;
}

export interface HeadingProps extends BaseProps {
  id?: string;
}

/** Build an `h2`–`h6` renderer with a hover anchor link to its `id`. */
export function makeHeading(Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
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
            class="anchor ml-2 text-(--clean-fg-muted) opacity-0 no-underline group-hover:opacity-100"
          >
            #
          </a>
        )}
      </Tag>
    );
  };
}

/** Normalise a className that may arrive as a string or a hast-style array. */
export function cx(className: unknown): string {
  if (Array.isArray(className)) return className.filter(Boolean).join(' ');
  if (typeof className === 'string') return className;
  return '';
}

/** Flatten an arbitrary vnode tree to its text content (for the copy button). */
export function textContent(node: ComponentChildren): string {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (isValidElement(node)) {
    return textContent((node as VNode<{ children?: ComponentChildren }>).props?.children);
  }
  return '';
}
