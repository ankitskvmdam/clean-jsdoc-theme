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
  /** The rendered MDX content of the tab panel. */
  children?: ComponentChildren;
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

export function Tabs({ children }: { children?: ComponentChildren }) {
  // MDX interleaves whitespace/text nodes; keep only the real Tab vnodes.
  const tabs = toChildArray(children).filter(
    (child): child is VNode<TabProps> =>
      typeof child === 'object' && child != null && (child as VNode).type === Tab
  );

  if (tabs.length === 0) return null;

  const block = tabsBlockCounter++;
  const tabId = (i: number) => `tabs-${block}-tab-${i}`;
  const panelId = (i: number) => `tabs-${block}-panel-${i}`;

  return (
    <div data-island="tabs" class="my-4 rounded border border-(--clean-border)">
      <div
        role="tablist"
        class="flex gap-1 border-b border-(--clean-border) bg-(--clean-bg-muted) px-2 pt-2"
      >
        {tabs.map((tab, i) => (
          <button
            key={tabId(i)}
            id={tabId(i)}
            role="tab"
            type="button"
            aria-controls={panelId(i)}
            aria-selected={i === 0}
            tabIndex={i === 0 ? 0 : -1}
            // Active state is driven purely by the `aria-selected:` variant, so
            // the island only has to flip `aria-selected` to restyle — no
            // active-class juggling.
            class="rounded-t border border-b-0 border-transparent px-3 py-1 text-sm text-(--clean-fg-muted) hover:text-(--clean-fg) aria-selected:border-(--clean-border) aria-selected:bg-(--clean-bg) aria-selected:text-(--clean-fg)"
          >
            {tab.props.label ?? `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={panelId(i)}
          id={panelId(i)}
          role="tabpanel"
          aria-labelledby={tabId(i)}
          hidden={i !== 0}
          class="bg-(--clean-bg) px-4 py-3 *:first:mt-0 *:last:mb-0"
        >
          {tab.props.children}
        </div>
      ))}
    </div>
  );
}
