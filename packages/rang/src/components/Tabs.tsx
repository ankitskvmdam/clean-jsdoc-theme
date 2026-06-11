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
    <div data-island="tabs" class="my-6">
      {/* Underline tab bar: a row of text tabs sharing one bottom border. The
          active tab (driven purely by the `aria-selected:` variant the island
          flips) takes the primary color + a `border-current` underline that sits
          on the bar via `-mb-px`; inactive tabs are full-strength text with a
          hover underline. */}
      <div
        role="tablist"
        class="mb-6 flex min-w-full gap-x-6 overflow-auto border-b border-(--clean-border)"
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
            class="-mb-px flex max-w-max cursor-pointer items-center gap-1.5 whitespace-nowrap border-b border-transparent pt-3 pb-2.5 text-sm leading-6 font-semibold text-(--clean-fg) hover:border-(--clean-border) aria-selected:border-current aria-selected:text-primary dark:aria-selected:text-primary-light"
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
          class="*:first:mt-0 *:last:mb-0"
        >
          {tab.props.children}
        </div>
      ))}
    </div>
  );
}
