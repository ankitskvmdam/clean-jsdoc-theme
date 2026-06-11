/**
 * Tabs — a tabbed view. setu emits `<Tabs>` / `<Tab label="…">` (capitalized →
 * routed through the MDX components map).
 *
 * Interactivity is provided by the `tabs` island, but the island only ENHANCES
 * the SSR markup — it does NOT hydrate it with Preact. The panel content is
 * arbitrary rendered MDX HTML (paragraphs, code blocks, nested components), so
 * re-rendering it through Preact on the client would be wasteful and risk a
 * mismatch. Instead the component SSR-renders the full, already-functional
 * ARIA tablist + panels (first tab visible, the rest `hidden`), and the island
 * just toggles `aria-selected` / `tabIndex` / `hidden` on click + keyboard nav.
 */

import { toChildArray } from 'preact';
import type { ComponentChildren, VNode } from 'preact';

export interface TabProps {
  /** Tab button label; falls back to `Tab N`. */
  label?: string;
  /**
   * Sync key used by grouped tabs (see `Tabs`' `group`). When a `<Tabs group>`
   * block is switched, every other grouped block on the page (and on later
   * page loads) jumps to the tab sharing this `value`. Defaults to the
   * normalized label (lower-cased, trimmed), so identical labels sync for free.
   */
  value?: string;
  /** The rendered MDX content of the tab panel. */
  children?: ComponentChildren;
}

/** Normalize a label into a stable sync value (lower-cased, whitespace-trimmed). */
function tabValue(tab: VNode<TabProps>, i: number): string {
  const v = tab.props.value;
  if (typeof v === 'string' && v.trim()) return v.trim();
  const label = tab.props.label;
  if (typeof label === 'string' && label.trim()) return label.trim().toLowerCase();
  return `tab-${i + 1}`;
}

/**
 * A logical marker, never rendered on its own — `Tabs` reads its props off the
 * child vnodes directly (`.type === Tab` → pull `label`/`children` from
 * `.props`). Returning `null` keeps a stray `<Tab>` outside a `<Tabs>` from
 * leaking markup. Mirrors `Step`.
 */
export function Tab(_props: TabProps) {
  return null;
}

// Module-level counter, bumped once per `Tabs` instance at render, so multiple
// `<Tabs>` blocks on one page get distinct id prefixes (`tabs-0-…`, `tabs-1-…`).
// This is deterministic within a single-threaded page render (no Math.random /
// Date.now, which are banned in dwar's pure render path). The ids are page-local
// and need not be reproducible across builds.
let tabsBlockCounter = 0;

export function Tabs({ children, group }: { children?: ComponentChildren; group?: string }) {
  // MDX interleaves whitespace/text nodes; keep only the real Tab vnodes.
  const tabs = toChildArray(children).filter(
    (child): child is VNode<TabProps> =>
      typeof child === 'object' && child != null && (child as VNode).type === Tab
  );

  if (tabs.length === 0) return null;

  const block = tabsBlockCounter++;
  const tabId = (i: number) => `tabs-${block}-tab-${i}`;
  const panelId = (i: number) => `tabs-${block}-panel-${i}`;
  // `group` opts this block into cross-block sync: the enhancer reads it (and the
  // per-tab `data-tabs-value`) to mirror the user's choice across every grouped
  // block on the page and persist it for the next visit.
  const groupName = typeof group === 'string' && group.trim() ? group.trim() : undefined;

  return (
    <div data-island="tabs" data-tabs-group={groupName} class="my-6">
      {/* Underline tab bar: a row of text tabs sharing one bottom border. The
          active tab (driven purely by the `aria-selected:` variant the island
          flips) takes the primary color + a `border-current` underline; inactive
          tabs are full-strength text with a hover underline.

          The baseline border lives on an OUTER wrapper that does not clip, while
          the inner row is the horizontal scroller (`overflow-x-auto`). The
          scroller is pulled down 1px (`-mb-px`) so the tabs' bottom borders land
          exactly ON the baseline. The `-mb-px` is on the scroller — NOT the
          buttons — so nothing overflows the clipping box; putting it on the
          buttons (with `overflow-auto` on the scroller) clipped the active
          underline until a scroll forced a repaint. */}
      <div class="mb-6 border-b border-(--clean-border)">
        <div role="tablist" class="-mb-px flex min-w-full gap-x-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tabId(i)}
              id={tabId(i)}
              role="tab"
              type="button"
              aria-controls={panelId(i)}
              aria-selected={i === 0}
              tabIndex={i === 0 ? 0 : -1}
              data-tabs-value={tabValue(tab, i)}
              class="flex max-w-max cursor-pointer items-center gap-1.5 whitespace-nowrap border-b border-transparent pt-3 pb-2.5 text-sm leading-6 font-semibold text-(--clean-fg) hover:border-(--clean-border) aria-selected:border-current aria-selected:text-primary dark:aria-selected:text-primary-light"
            >
              {tab.props.label ?? `Tab ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab, i) => (
        <div
          key={panelId(i)}
          id={panelId(i)}
          role="tabpanel"
          aria-labelledby={tabId(i)}
          hidden={i !== 0}
          class="*:first:mt-0 *:last:mb-0"
        >
          {tab.props.children}
        </div>
      ))}
    </div>
  );
}
