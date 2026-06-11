/**
 * Previous/next page pager — the box-card footer navigation common to most docs
 * sites (Docusaurus / Nextra / VitePress). dwar computes each page's neighbors
 * in sidebar reading order and hands them here; this is pure SSR markup (plain
 * anchors, no island).
 *
 * Layout: a two-column grid — the previous card aligns left, the next card
 * aligns right. When only one neighbor exists, an empty cell holds the other
 * column so a lone "Next" still sits on the right.
 */

import { ArrowLeft, ArrowRight } from 'lucide-preact';
import { withBase } from '@clean-jsdoc-theme/utils';

/** One neighbor link in the pager. */
export interface PageNavLink {
  /** Page slug (no leading slash); resolved against `basePath` for the href. */
  slug: string;
  /** Page title, shown as the card heading. */
  title: string;
  /** Short description (already truncated by dwar) shown under the title. */
  description?: string;
}

export interface PageNavProps {
  prev?: PageNavLink;
  next?: PageNavLink;
  basePath?: string;
}

function PageNavCard({
  dir,
  link,
  basePath,
}: {
  dir: 'prev' | 'next';
  link: PageNavLink;
  basePath: string;
}) {
  const isPrev = dir === 'prev';
  return (
    <a
      href={withBase(basePath, '/' + link.slug)}
      class={`group flex flex-col gap-1 rounded-lg border border-(--clean-border) p-4 transition-colors hover:border-(--clean-link) hover:bg-(--clean-bg-muted) ${
        isPrev ? 'items-start text-left' : 'items-end text-right'
      }`}
    >
      <span class="flex items-center gap-1 text-xs font-medium text-(--clean-fg-muted)">
        {isPrev ? <ArrowLeft size={14} aria-hidden="true" /> : null}
        {isPrev ? 'Previous' : 'Next'}
        {isPrev ? null : <ArrowRight size={14} aria-hidden="true" />}
      </span>
      <span class="font-medium text-(--clean-fg) group-hover:text-(--clean-link)">{link.title}</span>
      {link.description ? (
        <span class="line-clamp-2 text-sm text-(--clean-fg-muted)">{link.description}</span>
      ) : null}
    </a>
  );
}

/** The prev/next pager. Renders nothing when the page has no neighbors. */
export function PageNav({ prev, next, basePath = '/' }: PageNavProps) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label="Pagination"
      class="mt-12 grid grid-cols-1 gap-4 border-t border-(--clean-border) pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <PageNavCard dir="prev" link={prev} basePath={basePath} />
      ) : (
        // Hold the left column so a lone "Next" still aligns right (≥ sm).
        <span class="hidden sm:block" />
      )}
      {next ? <PageNavCard dir="next" link={next} basePath={basePath} /> : null}
    </nav>
  );
}
