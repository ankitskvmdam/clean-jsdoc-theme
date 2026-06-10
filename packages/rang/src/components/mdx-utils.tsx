/**
 * Shared utilities for the MDX element renderers: the common prop types, the
 * `makeHeading` factory, and the `cx` / `textContent` helpers. Kept separate
 * from the element renderers (`mdx-tags`) and the code components (`CodeBlock`)
 * so both can import them without a cycle.
 */

import type { ComponentChildren, VNode } from 'preact';
import { createContext, isValidElement } from 'preact';
import { useContext } from 'preact/hooks';
import { Check, Link } from 'lucide-preact';
import { Button } from './Button';

export interface BaseProps {
  children?: ComponentChildren;
  // MDX passes through arbitrary HTML-style props; `unknown` at the registry
  // level absorbs that heterogeneity.
  [key: string]: unknown;
}

/**
 * A node (e.g. the copy-page button) to drop into the first heading's row.
 * `placed` guards against re-placement when a page has more than one heading.
 * Mutating it during render is safe here: MDX content is server-rendered in a
 * single top-down pass and never hydrated as a whole (only its island markers
 * hydrate, independently), so the first heading rendered is the page's.
 */
export interface HeaderSlot {
  node: ComponentChildren;
  placed: boolean;
}

/** Provided by dwar around the MDX render; consumed by the first heading. */
export const HeaderSlotContext = createContext<HeaderSlot | null>(null);

/** Claim the header slot for the first heading rendered; returns its node once, else null. */
export function useHeaderSlot(): ComponentChildren | null {
  const slot = useContext(HeaderSlotContext);
  if (!slot || slot.placed || slot.node == null) return null;
  slot.placed = true;
  return slot.node;
}

/**
 * Lay a heading and the header-slot node out on one row: side by side with the
 * node pushed right (`justify-between`), wrapping the node below — left-aligned —
 * on a narrow screen or when the heading is too long to share the line.
 */
export function HeaderRow({
  marginClass,
  children,
  slot,
}: {
  marginClass: string;
  children: ComponentChildren;
  slot: ComponentChildren;
}) {
  // gap-y-1 (4px) keeps the heading↔button spacing tight when the button wraps
  // below on a narrow screen / long heading; gap-x-4 spaces them when side by side.
  return (
    <div class={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 ${marginClass}`}>
      {children}
      <div class="shrink-0">{slot}</div>
    </div>
  );
}

export interface HeadingProps extends BaseProps {
  id?: string;
}

/**
 * Hover-revealed anchor affordance shown to the LEFT of a heading: a muted
 * lucide link icon, rendered as a ghost icon `Button`. It is a real `<button>`
 * (never an `<a>`) carrying a `data-heading-anchor` marker; dwar's inline
 * `heading-anchors` script delegates the click — updating the URL hash and
 * copying the link — so the markup stays SSR-only (no per-heading hydration).
 * The whole heading is clickable too; this button just signals that.
 *
 * On a successful copy the script sets `data-copied` on the button for 3s; the
 * named `group/anchor` swaps the link icon for a `Check` (CSS-driven, since the
 * markup never hydrates). The unnamed `group-hover` still keys off the heading's
 * own `group` for the opacity reveal.
 */
export function HeadingAnchor() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      data-heading-anchor
      aria-label="Copy link to this section"
      class="group/anchor anchor absolute top-1/2 -left-7 -translate-y-1/2 text-muted-foreground opacity-0 transition group-hover:opacity-100 data-copied:opacity-100"
    >
      <Link size={16} aria-hidden="true" class="group-data-copied/anchor:hidden" />
      <Check
        size={16}
        aria-hidden="true"
        class="hidden text-(--clean-accent) group-data-copied/anchor:block"
      />
    </Button>
  );
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
      <Tag
        id={id}
        class={`group relative scroll-mt-20 ${id ? 'cursor-pointer' : ''} ${headingClass[Tag]}`}
        {...rest}
      >
        {id && <HeadingAnchor />}
        {children}
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
