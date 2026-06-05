import { useEffect, useRef, useState } from 'preact/hooks';
import { TextAlignStart } from 'lucide-preact';
import type { Heading } from '@clean-jsdoc-theme/utils';

export interface TOCProps {
  headings: Heading[];
}

// Horizontal offsets by heading depth (ported from fumadocs' clerk TOC). The
// line sits at `getLineOffset`; the text is indented to `getItemOffset` so the
// rail has a gutter. Deeper headings shift right, which is what makes the rail
// "dip" at sub-headings.
const A = 8;
function getItemOffset(depth: number): number {
  if (depth <= 2) return 12 + A;
  if (depth === 3) return 24 + A;
  return 36 + A;
}
function getLineOffset(depth: number): number {
  if (depth <= 2) return A;
  if (depth === 3) return 8 + A;
  return 16 + A;
}

/** Per-heading intersection record (ported from fumadocs' TOC observer). */
interface TocItemState {
  id: string;
  active: boolean;
  /** active by bottom-of-page fallback rather than real intersection */
  fallback: boolean;
}

/** Geometry of the rail, recomputed from the live DOM on resize. */
interface RailGeometry {
  width: number;
  height: number;
  /** SVG path `d` connecting every item with a curve at each depth change. */
  d: string;
  /** item ids in document order that have a rendered anchor */
  ids: string[];
  /** id → [lineTop, lineBottom, x] */
  pos: Record<string, [number, number, number]>;
}

export function TOC({ headings }: TOCProps) {
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [geo, setGeo] = useState<RailGeometry | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Scroll-spy ────────────────────────────────────────────────────────────
  // Ported from fumadocs (packages/core/src/toc.tsx): track every heading's
  // intersection; the active SET is every heading ≥90% visible. When nothing
  // intersects (between sections / page bottom) fall back to the heading whose
  // top is nearest the viewport top, so the last section stays highlighted.
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

  // ── Rail geometry ───────────────────────────────────────────────────────--
  // Build the curved path from the live anchor positions (fumadocs' onPrint).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      if (container.clientHeight === 0) return;
      let w = 0;
      let h = 0;
      let d = '';
      const order: string[] = [];
      const pos: Record<string, [number, number, number]> = {};
      let prev: [number, number, number] | null = null;

      for (const head of headings) {
        const el = container.querySelector<HTMLElement>(`a[href="#${head.id}"]`);
        if (!el) continue;
        const styles = getComputedStyle(el);
        const x = getLineOffset(head.depth) + 0.5;
        const top = el.offsetTop + parseFloat(styles.paddingTop);
        const bottom = el.offsetTop + el.clientHeight - parseFloat(styles.paddingBottom);

        w = Math.max(x + 8, w);
        h = Math.max(h, bottom);

        if (!prev) {
          d += `M${x} ${top} L${x} ${bottom}`;
        } else {
          // Cubic bezier from the previous segment's bottom to this one's top —
          // a straight drop when depth is unchanged, a sideways dip when it isn't.
          d += ` C ${prev[2]} ${top - 4} ${x} ${prev[1] + 4} ${x} ${top} L${x} ${bottom}`;
        }

        pos[head.id] = [top, bottom, x];
        order.push(head.id);
        prev = [top, bottom, x];
      }

      setGeo({ width: w, height: h, d, ids: order, pos });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  // Clip the accent path to the span from the first to the last active item, so
  // the highlighted rail grows to cover every heading currently in view.
  let clip = 'polygon(0 0, 100% 0, 100% 0, 0 0)';
  if (geo) {
    const activeInOrder = geo.ids.filter((id) => activeIds.includes(id));
    if (activeInOrder.length > 0) {
      const top = geo.pos[activeInOrder[0]][0];
      const bottom = geo.pos[activeInOrder[activeInOrder.length - 1]][1];
      clip = `polygon(0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px)`;
    }
  }

  return (
    <nav aria-label="On this page" class="text-[var(--clean-fg)]">
      <h2 class="mb-2 flex items-center gap-2 text-base font-semibold text-[var(--clean-fg-muted)]">
        <TextAlignStart size={16} aria-hidden="true" />
        On this page
      </h2>
      <div ref={containerRef} class="relative flex flex-col text-sm">
        {geo && (
          <>
            {/* Faint full-length rail. */}
            <svg
              aria-hidden="true"
              width={geo.width}
              height={geo.height}
              viewBox={`0 0 ${geo.width} ${geo.height}`}
              class="pointer-events-none absolute top-0 left-0"
            >
              <path d={geo.d} fill="none" stroke="var(--clean-border)" stroke-width="1" />
            </svg>
            {/* Accent rail, clipped to the active span (slides + grows). */}
            <svg
              aria-hidden="true"
              width={geo.width}
              height={geo.height}
              viewBox={`0 0 ${geo.width} ${geo.height}`}
              class="pointer-events-none absolute top-0 left-0"
              style={{ clipPath: clip, transition: 'clip-path 200ms ease-out' }}
            >
              <path d={geo.d} fill="none" stroke="var(--clean-accent)" stroke-width="1" />
            </svg>
          </>
        )}
        {headings.map((h) => {
          const isActive = activeIds.includes(h.id);
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              data-active={isActive ? 'true' : undefined}
              aria-current={isActive ? 'location' : undefined}
              class={`relative py-1.5 transition-colors hover:text-[var(--clean-accent)] ${
                isActive ? 'text-[var(--clean-accent)]' : 'text-[var(--clean-fg-muted)]'
              }`}
              style={{ paddingInlineStart: `${getItemOffset(h.depth)}px` }}
            >
              {h.text}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
