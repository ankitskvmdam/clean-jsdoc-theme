import { useEffect, useRef, useState } from 'preact/hooks';
import type { Heading } from '@clean-jsdoc-theme/utils';

// Horizontal offsets by heading depth (ported from fumadocs' clerk TOC). The
// line sits at `getLineOffset`; the text is indented to `getItemOffset` so the
// rail has a gutter. Deeper headings shift right, which is what makes the rail
// "dip" at sub-headings. Shared by the rail TOC and the mobile popover so both
// indent the list identically.
const A = 8;
export function getItemOffset(depth: number): number {
  if (depth <= 2) return 12 + A;
  if (depth === 3) return 24 + A;
  return 36 + A;
}
export function getLineOffset(depth: number): number {
  if (depth <= 2) return A;
  if (depth === 3) return 8 + A;
  return 16 + A;
}

/**
 * Small absolute inset (px) so the active item never sits flush against the top
 * edge of the TOC viewport on very tall lists. Used as the `min(30%, padding)`
 * landing point below.
 */
const COMFORTABLE_PADDING = 24;

/**
 * Decide where the TOC's scroll container should scroll so the active item
 * stays visible — the auto-scroll Fumadocs' TOC does and our port dropped.
 *
 * All values are in the scroll container's content coordinate space (i.e.
 * relative to `scrollTop = 0`). Pure so it's unit-testable without a DOM:
 *
 *   - Not scrollable (`scrollHeight <= clientHeight`) → `null` (do nothing).
 *   - Item already inside the comfortable band (30%–70% of the visible height)
 *     → `null` (do nothing).
 *   - Otherwise → the target `scrollTop` that lands the item `min(30%, padding)`
 *     below the top of the visible area, clamped to `[0, maxScroll]`.
 */
export function computeTocScrollTop(
  itemTop: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  padding = COMFORTABLE_PADDING
): number | null {
  if (scrollHeight <= clientHeight) return null; // nothing to scroll
  const comfortableTop = scrollTop + clientHeight * 0.3;
  const comfortableBottom = scrollTop + clientHeight * 0.7;
  if (itemTop >= comfortableTop && itemTop <= comfortableBottom) return null;

  const target = itemTop - Math.min(clientHeight * 0.3, padding);
  const maxScroll = scrollHeight - clientHeight;
  return Math.max(0, Math.min(target, maxScroll));
}

/**
 * Nearest scrollable ancestor of `el` — the element whose `overflow-y` opts into
 * scrolling (the sticky `overflow-y-auto` wrapper the Layout puts the TOC in).
 * Whether it's *currently* overflowing is left to `computeTocScrollTop`; this
 * just locates the container. Returns `null` if none is found.
 */
export function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
    node = node.parentElement;
  }
  return null;
}

/** Per-heading intersection record (ported from fumadocs' TOC observer). */
interface TocItemState {
  id: string;
  active: boolean;
  /** active by bottom-of-page fallback rather than real intersection */
  fallback: boolean;
}

/**
 * Scroll-spy hook, ported from fumadocs (packages/core/src/toc.tsx): track
 * every heading's intersection; the active SET is every heading ≥90% visible.
 * When nothing intersects (between sections / page bottom) fall back to the
 * heading whose top is nearest the viewport top, so the last section stays
 * highlighted. Returns the active ids in document order.
 *
 * Shared by the desktop rail (`TOC`) and the mobile popover (`TocPopover`) so
 * both presentations highlight the same headings from one observer definition.
 */
export function useActiveHeadings(headings: Heading[]): string[] {
  const [activeIds, setActiveIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const ids = headings.map((h) => h.id);
    const observed = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (observed.length === 0) return;

    let items: TocItemState[] = ids.map((id) => ({ id, active: false, fallback: false }));

    const emit = () => setActiveIds(items.filter((it) => it.active).map((it) => it.id));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        let hasActive = false;

        items = items.map((item) => {
          const entry = entries.find((e) => e.target.id === item.id);
          const active = entry ? entry.isIntersecting : item.active && !item.fallback;
          if (active) hasActive = true;
          if (item.active !== active) return { ...item, active, fallback: false };
          return item;
        });

        if (!hasActive && entries[0].rootBounds) {
          const viewTop = entries[0].rootBounds.top;
          let min = Number.MAX_VALUE;
          let idx = -1;
          for (let i = 0; i < items.length; i++) {
            const el = document.getElementById(items[i].id);
            if (!el) continue;
            const d = Math.abs(viewTop - el.getBoundingClientRect().top);
            if (d < min) {
              min = d;
              idx = i;
            }
          }
          if (idx !== -1) items[idx] = { ...items[idx], active: true, fallback: true };
        }

        emit();
      },
      { threshold: 0.9 }
    );

    observed.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return activeIds;
}

// Reference line for the "current section": a heading counts as current once its
// top edge scrolls above this many px from the viewport top. Approximates the
// sticky chrome the heading tucks under — header (h-16 = 64px) + the mobile TOC
// bar (h-12 = 48px) + a small buffer — so the bar names the section whose
// content sits just below the chrome, not one hidden behind it.
/** Fallback trigger offset when the bar can't be measured: header (h-16 = 64px)
 *  + the mobile TOC bar (h-12 = 48px). Prefer the measured `offset` instead. */
const FALLBACK_OFFSET = 112;

/**
 * Pick the active heading index from the headings' absolute document tops and
 * the current scroll metrics. Pure (no DOM, no side effects) so it's unit
 * testable. `offset` is the distance below the viewport top of the trigger line
 * — pass the bottom edge of any sticky chrome so the line sits just below it.
 *
 * The model, in order:
 *   1. Top clamp     — at/above the top, the first heading is active.
 *   2. Bottom clamp  — at/below max scroll, the last heading is active.
 *   3. Trigger scan  — otherwise the last heading whose top has crossed the
 *                      trigger line (`scrollY + offset`). Position-based, not a
 *                      global scroll fraction, since headings aren't evenly spaced.
 *   4. Tail fallback — headings whose top lies in the final viewport-height can
 *                      never reach the line (the page runs out of scroll first);
 *                      those trailing headings are swept proportionally across
 *                      the remaining scroll so each still activates.
 */
export function getActiveHeadingIndex(
  tops: number[],
  scrollY: number,
  maxScroll: number,
  offset: number
): number {
  const n = tops.length;
  if (n <= 1) return 0;
  // 1. Top → first. Also covers pages too short to scroll.
  if (scrollY <= 0 || maxScroll <= 0) return 0;
  // 2. Bottom → last.
  if (scrollY >= maxScroll) return n - 1;

  const triggerLine = scrollY + offset;
  // Headings past this point can never reach the trigger line.
  const deadZoneStart = maxScroll + offset;
  const firstUnreachable = tops.findIndex((t) => t > deadZoneStart);

  // 3. No unreachable tail → plain trigger-line scan.
  if (firstUnreachable === -1) {
    let active = 0;
    for (let i = 0; i < n; i++) {
      if (tops[i] <= triggerLine) active = i;
      else break;
    }
    return active;
  }

  // There is a tail. Everything before it still uses the trigger line.
  const base = Math.max(firstUnreachable - 1, 0);
  const reachScroll = firstUnreachable > 0 ? Math.max(tops[firstUnreachable - 1] - offset, 0) : 0;

  if (scrollY < reachScroll) {
    let active = 0;
    for (let i = 0; i < firstUnreachable; i++) {
      if (tops[i] <= triggerLine) active = i;
      else break;
    }
    return active;
  }

  // 4. Proportional sweep through the unreachable tail.
  const progress = (scrollY - reachScroll) / (maxScroll - reachScroll); // 0..1
  const tailCount = n - base;
  const tailOffset = Math.min(tailCount - 1, Math.floor(progress * tailCount));
  return base + tailOffset;
}

/**
 * Scroll-spy for the mobile bar: returns the single active heading index (via
 * `getActiveHeadingIndex`) plus the true page-scroll fraction (0–1) for the
 * progress ring. Unlike `useActiveHeadings` (a SET of fully-visible headings,
 * for the rail's accent span), this names one "current" section and is correct
 * at the very top and bottom of the page.
 *
 * `getOffset` supplies the trigger line dynamically — the consumer passes the
 * sticky bar's measured bottom edge so the line tracks the real chrome height
 * instead of a hard-coded constant.
 *
 * Recomputes on scroll (rAF-coalesced to one frame), on resize, and on any
 * body size change (`ResizeObserver`) or web-font swap — late layout shifts are
 * the usual cause of a stale highlight. Runs once on mount so a deep-link
 * `#hash` lands on the right item on first paint.
 */
export function useTocProgress(
  headings: Heading[],
  getOffset?: () => number
): { currentIndex: number; progress: number } {
  const [state, setState] = useState({ currentIndex: 0, progress: 0 });
  const getOffsetRef = useRef(getOffset);
  getOffsetRef.current = getOffset;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (headings.length === 0) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const offset = getOffsetRef.current?.() ?? FALLBACK_OFFSET;

      // Absolute document top of each heading (don't cache offsetTop across layout shifts).
      const tops = headings.map((h) => {
        const el = document.getElementById(h.id);
        return el ? el.getBoundingClientRect().top + scrollY : Number.POSITIVE_INFINITY;
      });

      const currentIndex = getActiveHeadingIndex(tops, scrollY, maxScroll, offset);
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

      setState((prev) =>
        prev.currentIndex === currentIndex && Math.abs(prev.progress - progress) < 0.001
          ? prev
          : { currentIndex, progress }
      );
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(compute);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(schedule);
      ro.observe(document.body);
    }
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) fonts.ready.then(schedule).catch(() => {});

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
    };
  }, [headings]);

  return state;
}
