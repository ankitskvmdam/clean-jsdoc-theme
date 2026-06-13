/**
 * The chrome catalog — the canonical list of UI strings the theme renders.
 *
 * This is the single source of truth for translatable chrome (per the plan's
 * `chrome.*` namespace). It's authored as a nested object for readability, then
 * flattened to dotted keys (`chrome.search.placeholder`) for the runtime `t`
 * lookup. The dotted-key union {@link ChromeKey} is *derived from this object*,
 * so every `t('chrome.…')` call site is compile-checked against the real keys —
 * a typo or a removed key is a type error, not a silent fallback.
 *
 * Values may carry `{name}` interpolation tokens (see {@link interpolate}); the
 * names here are the contract translators must preserve.
 *
 * Pure + browser-safe: this module is bundled into the browser by rang.
 */

/**
 * The default (English) chrome strings, grouped by the component that owns them.
 * Strings mirror the literals currently hardcoded in rang — this is the baseline
 * the rang refactor (Phase 1) replaces with `t(key)` calls.
 */
export const EN_CHROME = {
  common: {
    /** Dialog/drawer close button + the palette footer's Close button. */
    close: 'Close',
  },
  search: {
    /** CtrlK search input placeholder. */
    placeholder: 'Search docs...',
    /** Accessible label for the search input. */
    inputLabel: 'Search query',
    /** Accessible label for the header search trigger. */
    triggerLabel: 'Search',
    /** Tooltip on the header search trigger. */
    triggerTitle: 'Search (Ctrl K)',
    /** Accessible label for the search dialog. */
    dialogLabel: 'Search',
    /** Accessible label for the results list. */
    resultsLabel: 'Search results',
    /** Section heading above recent searches. */
    recent: 'Recent',
    /** Section heading above favorite searches. */
    favorite: 'Favorite',
    /** Empty-state when a query matches nothing. */
    noResults: 'No matching pages',
    /** Empty-state when there's no query and no saved searches. */
    emptyHint: 'Type to search the docs',
    /** Connector for a result's parent context ("Title in Parent"). Carries the context. */
    inContext: 'in {context}',
    /** Keyboard-hint line in the palette footer. */
    footerHint: '↑↓ to navigate · ↵ to open · esc to close',
    /** Star-button label (favorites). Carries the page title. */
    saveToFavorites: 'Save {title} to favorites',
    /** Un-star-button label (favorites). Carries the page title. */
    removeFromFavorites: 'Remove {title} from favorites',
    /** Forget-button label (recents). Carries the page title. */
    removeFromRecent: 'Remove {title} from recent searches',
  },
  footer: {
    /** Repository link label. */
    repository: 'Repository',
  },
  nav: {
    /** Accessible label for the sidebar navigation landmark. */
    docNavLabel: 'Documentation navigation',
    /** Accessible label for the mobile-nav open button. */
    open: 'Open navigation',
    /** Tooltip on the mobile-nav trigger. */
    menu: 'Menu',
    /** Accessible label for the mobile-nav drawer dialog. */
    drawerLabel: 'Navigation',
  },
  toc: {
    /** Accessible label for the on-this-page table of contents. */
    label: 'On this page',
  },
  theme: {
    /** Tooltip on the theme toggle. */
    toggleTitle: 'Toggle theme',
    /** Accessible label on the theme toggle. Carries the target mode. */
    switchTo: 'Switch to {mode} theme',
  },
  settings: {
    /** Dialog title + trigger label. */
    title: 'Settings',
    /** Font-size group heading/label. */
    fontSize: 'Font size',
    /** Line-spacing group heading/label. */
    lineSpacing: 'Line spacing',
    sizeSmall: 'Small',
    sizeDefault: 'Default',
    sizeLarge: 'Large',
    spacingCompact: 'Compact',
    spacingDefault: 'Default',
    spacingRelaxed: 'Relaxed',
  },
  pager: {
    /** Accessible label for the prev/next pager landmark. */
    label: 'Pagination',
    /** "Previous page" eyebrow label. */
    previous: 'Previous',
    /** "Next page" eyebrow label. */
    next: 'Next',
  },
  code: {
    /** Accessible label for the code-variant tablist. */
    variantsLabel: 'Code variants',
    /** Copy-to-clipboard button accessible label (idle). */
    copy: 'Copy to clipboard',
    /** Copy-to-clipboard button accessible label (after copy). */
    copied: 'Copied to clipboard',
    /** Visible copy-button text (idle). */
    copyShort: 'Copy',
    /** Visible copy-button text (after copy). */
    copiedShort: 'Copied!',
    /** Accessible label for the heading-anchor copy-link button. */
    copyLink: 'Copy link to this section',
  },
  copyPage: {
    /** Accessible label for the split-button's extra-options trigger. */
    moreOptions: 'More copy options',
    /** Accessible label for the dropdown menu of copy actions. */
    menuLabel: 'Copy page options',
    copyTitle: 'Copy page',
    /** Primary-button text after a successful copy. */
    copied: 'Copied',
    copyDescription: 'Copy page as Markdown for LLMs',
    viewTitle: 'View Markdown',
    viewDescription: 'View this page as plain text',
    claudeTitle: 'Open in Claude',
    claudeDescription: 'Ask Claude about this page',
    chatgptTitle: 'Open in ChatGPT',
    chatgptDescription: 'Ask ChatGPT about this page',
    perplexityTitle: 'Open in Perplexity',
    perplexityDescription: 'Ask Perplexity about this page',
  },
  embed: {
    /** Click-to-load button label (untitled embed). */
    load: 'Load embedded content',
    /** Click-to-load button label, carrying the embed title. */
    loadTitled: 'Load embedded content: {title}',
    /** Poster heading when the embed has no title. */
    posterTitle: 'Embedded content',
    /** The small "Load" pill on the click-to-load poster. */
    loadPill: 'Load',
  },
  language: {
    /** Accessible label + tooltip for the language switcher. */
    label: 'Language',
  },
} as const;

/** The authored shape of {@link EN_CHROME}. */
export type ChromeCatalog = typeof EN_CHROME;

/**
 * Recursive dotted-path union of a nested string object: `{ a: { b: '' } }`
 * yields `'a.b'`. Stops at string leaves.
 */
type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : DotPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/**
 * Every chrome key, fully qualified under the `chrome.` namespace — e.g.
 * `'chrome.search.placeholder'`. This is the compile-checked key set for `t`.
 */
export type ChromeKey = `chrome.${DotPaths<ChromeCatalog>}`;

/** A flat message map: dotted key → string. Both `chrome.*` and `api.*` live here. */
export type Messages = Record<string, string>;

/** Recursively flatten a nested string object into a dotted-key map. */
function flatten(node: Record<string, unknown>, prefix: string, out: Messages): void {
  for (const [key, value] of Object.entries(node)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (value && typeof value === 'object') {
      flatten(value as Record<string, unknown>, `${path}.`, out);
    }
  }
}

/**
 * The default chrome catalog as a flat `chrome.*` message map — the ultimate
 * fallback in the resolution chain and the canonical reference for validation.
 */
export const EN_CHROME_FLAT: Messages = (() => {
  const out: Messages = {};
  flatten(EN_CHROME, 'chrome.', out);
  return out;
})();
