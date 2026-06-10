import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronDown } from 'lucide-preact';
import type { Heading } from '@clean-jsdoc-theme/utils';
import { cn } from '../lib/cn';
import { getItemOffset, useTocProgress } from './toc-utils';

export interface TocPopoverProps {
  headings: Heading[];
}

/** Circular scroll-progress indicator (fumadocs' ProgressCircle). The arc is
 *  drawn by a stroke-dashoffset over a rotated circle, growing as `value` (0–1)
 *  rises. */
function ProgressCircle({ value }: { value: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      class="-rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="opacity-25"
      />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray={c}
        stroke-dashoffset={c * (1 - v)}
        class="transition-[stroke-dashoffset] duration-200"
      />
    </svg>
  );
}

/**
 * Mobile "On this page" bar — the `< lg` counterpart to the curved right-rail
 * `TOC`. Heavily influenced by fumadocs' toc popover: a trigger row (a circular
 * scroll-progress indicator + the current section title + a chevron) that
 * expands a height-animated, scrollable list of the page headings. Tapping a
 * heading or clicking outside collapses it; Escape closes too.
 *
 * Tracks the current section by scroll position via `useTocProgress` (a
 * reading-line rule, correct at the top and bottom of the page) and shares the
 * depth indentation (`getItemOffset`) with the rail. The compact list marks the
 * single current section ("you are here") rather than the rail's visible-set
 * span.
 *
 * The sticky/breakpoint placement lives in the Layout slot, not here, mirroring
 * the rail. Note: on `≥ lg` the rail is shown and this bar is CSS-hidden, but
 * both islands still hydrate — each runs its own scroll/observer listener.
 * That's an accepted tradeoff to keep each island a single, independent
 * hydration root rather than sharing tracking state across two roots.
 */
export function TocPopover({ headings }: TocPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLButtonElement>(null);
  // The trigger line is the bar's own bottom edge: when the sticky bar is stuck,
  // its bottom is exactly where content stops being obscured by the chrome.
  const { currentIndex, progress } = useTocProgress(headings, () =>
    barRef.current ? barRef.current.getBoundingClientRect().bottom : 112
  );

  const currentText = headings[currentIndex]?.text ?? 'On this page';

  // Indent relative to the shallowest heading on the page (matches the rail TOC),
  // so a multi-h1 page indents cleanly while single-title pages are unchanged.
  const minDepth = headings.length ? Math.min(...headings.map((h) => h.depth)) : 2;

  // Close on outside click / Escape — only while open.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (headings.length === 0) return null;

  return (
    <div ref={rootRef} class="text-(--clean-fg)">
      <button
        ref={barRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="On this page"
        class="flex h-12 w-full items-center gap-2.5 px-4 text-sm text-muted-foreground md:px-6"
      >
        <ProgressCircle value={progress} />
        {/* Title stack: the current section when collapsed, "On this page" when
            expanded — cross-faded in a single grid cell. */}
        <span class="grid flex-1 overflow-hidden text-left *:col-start-1 *:row-start-1 *:my-auto">
          <span
            class={cn(
              'truncate transition-[opacity,transform] duration-200',
              open ? 'opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
            )}
          >
            On this page
          </span>
          <span
            class={cn(
              'truncate transition-[opacity,transform] duration-200',
              open ? 'pointer-events-none translate-y-1 opacity-0' : 'opacity-100'
            )}
          >
            {currentText}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          class={cn('shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {/* Height-animated disclosure (grid-rows 0fr→1fr trick, no JS measuring). */}
      <div
        class={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div class="min-h-0 overflow-hidden">
          <nav
            aria-label="On this page"
            class="flex max-h-[50vh] flex-col overflow-y-auto px-4 pb-4 text-sm md:px-6"
          >
            {headings.map((h, i) => {
              const isActive = i === currentIndex;
              return (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  data-active={isActive ? 'true' : undefined}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => setOpen(false)}
                  class={cn(
                    'truncate py-1.5 transition-colors hover:text-[var(--clean-accent)]',
                    isActive ? 'text-[var(--clean-accent)]' : 'text-[var(--clean-fg-muted)]'
                  )}
                  style={{ paddingInlineStart: `${getItemOffset(h.depth - minDepth + 2)}px` }}
                >
                  {h.text}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
