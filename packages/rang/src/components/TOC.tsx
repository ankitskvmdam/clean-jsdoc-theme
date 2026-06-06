import { useEffect, useRef, useState } from 'preact/hooks';
import { TextAlignStart } from 'lucide-preact';
import type { Heading } from '@clean-jsdoc-theme/utils';
import { getItemOffset, getLineOffset, useActiveHeadings } from './toc-utils';

export interface TOCProps {
  headings: Heading[];
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
  const activeIds = useActiveHeadings(headings);
  const [geo, setGeo] = useState<RailGeometry | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <nav aria-label="On this page" class="text-(--clean-fg)">
      <h2 class="mb-2 flex items-center gap-2 text-base font-semibold text-muted-foreground">
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
