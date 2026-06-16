import { cn } from '../lib/cn';

export interface SimpleIconProps {
  /** Simple Icons slug, e.g. `codepen`, `jsfiddle`, `npm`. */
  slug: string;
  /** Extra classes (sizing/spacing). Defaults to a 1rem square. */
  class?: string;
}

/**
 * A monochrome Simple Icons CDN glyph, painted with the `fg` theme token via a
 * CSS mask. The silhouette SVG (`cdn.simpleicons.org/<slug>`) is used as a mask
 * over a `var(--clean-fg)` fill, so it picks up the exact fg color and the
 * light/dark swap for free (the variable is rebound under `[data-theme="dark"]`)
 * — no per-theme image pair, no baked-in hex. Shared by the sidebar's `NavIcon`
 * and the playground "Open Code in" menu.
 */
export function SimpleIcon({ slug, class: cls }: SimpleIconProps) {
  const url = `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`;
  const mask = `url(${url}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      class={cn('inline-block h-4 w-4 shrink-0 bg-(--clean-fg)', cls)}
      style={{ mask, WebkitMask: mask, opacity: 0.8 }}
    />
  );
}
