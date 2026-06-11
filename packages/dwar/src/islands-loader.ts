/**
 * Inline JS that runs on the client to hydrate islands. The loader does:
 *
 *   1. Read the per-page `<script type="application/json" data-island-props>` payload.
 *   2. Find each `[data-island]` element on the page.
 *   3. For each unique island name present, dynamically `import()` its chunk.
 *   4. The chunk self-registers — it iterates its own `[data-island="name"]`
 *      markers, reads the props from the payload via `data-island-id`, and
 *      calls Preact's `hydrate`.
 *
 * Why lazy: pages without (say) a `code-tabs` block don't pay for that chunk.
 */

import type { IslandName } from '@clean-jsdoc-theme/utils';

/**
 * Build the inline loader script. Given a `name → chunk href` map (the
 * content-hashed entry chunks emitted by `islands-bundle.ts`), the script
 * collects the `data-island` names present in the DOM and `import()`s only the
 * chunks whose markers actually exist — pages without (say) `code-tabs` don't
 * pay for that chunk. The shared chunk loads itself: the browser fetches it
 * automatically when an entry chunk imports it via relative ESM, so the map
 * only needs the entry hrefs.
 *
 * The first argument (names on the page) is unused — we embed the full map and
 * let the DOM scan decide what to import — but is kept as a hook for future
 * per-page bundling optimizations.
 */
export function getIslandsLoaderScript(
  _islandNamesOnPage: IslandName[],
  chunkHrefByName: Record<string, string>
): string {
  const map = JSON.stringify(chunkHrefByName);
  return [
    `(function(){`,
    `var map=${map};`,
    `var seen=new Set();`,
    `document.querySelectorAll('[data-island]').forEach(function(el){seen.add(el.getAttribute('data-island'));});`,
    `seen.forEach(function(name){var src=map[name];if(src){import(src);}});`,
    `})();`,
  ].join('');
}

/**
 * Source of an island chunk (one per IslandName). Built by `islands-bundle.ts`
 * via esbuild. Each chunk imports its component from rang, locates marker
 * elements, reads props, and hydrates them.
 *
 * Exported as a function so callers can inject the right import path per name.
 */
export function getIslandChunkEntrySource(name: IslandName): string {
  // copy-btn is special: it is embedded inline in MDX content (not in the
  // layout), so it carries no `data-island-id` and has no entry in the per-page
  // props payload. Its only prop — the code to copy — already lives in the DOM,
  // in the sibling <pre>. The chunk reads it from there at hydration time.
  if (name === 'copy-btn') {
    return `import { hydrate, h } from 'preact';
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

function hydrateAll() {
  const Component = ISLAND_REGISTRY['copy-btn'];
  if (!Component) return;
  document.querySelectorAll('[data-island="copy-btn"]').forEach((el) => {
    const wrapper = el.parentElement;
    const pre = wrapper && wrapper.querySelector('pre');
    const text = pre ? pre.textContent || '' : '';
    hydrate(h(Component, { text }), el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
} else {
  hydrateAll();
}
`;
  }

  // embed is an in-content island like copy-btn: no JSON props-payload entry.
  // Its whole config lives in the marker's `data-*` attributes (setu/the Embed
  // component wrote them at SSR time). We read them back into the stringy
  // `EmbedProps` the component expects and hydrate `EmbedBody` (the registry
  // entry) onto the marker itself — the body reconciles against the marker's
  // SSR children (iframe or poster+noscript), so the marker div (with its
  // data-*, class, style) is left untouched and there is no double-wrapping.
  if (name === 'embed') {
    return `import { hydrate, h } from 'preact';
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

function hydrateAll() {
  const Component = ISLAND_REGISTRY['embed'];
  if (!Component) return;
  document.querySelectorAll('[data-island="embed"]').forEach((el) => {
    const d = el.getAttribute.bind(el);
    const props = {};
    const src = d('data-src');
    if (src != null) props.src = src;
    const title = d('data-title');
    if (title != null) props.title = title;
    const allow = d('data-allow');
    if (allow != null) props.allow = allow;
    const sandbox = d('data-sandbox');
    if (sandbox != null) props.sandbox = sandbox;
    if (el.hasAttribute('data-click-to-load')) props.clickToLoad = 'true';
    // themed defaults ON: only the opt-out ("false") is written to the marker,
    // so forward the raw value and let the component default an absent one to on.
    const themed = d('data-themed');
    if (themed != null) props.themed = themed;
    hydrate(h(Component, props), el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
} else {
  hydrateAll();
}
`;
  }

  // code-viewer is a hybrid: it DOES have a props-payload entry (language,
  // filename, highlightLine keyed by data-island-id), but its `code` prop — the
  // whole file body — lives in the SSR `<pre>` inside the marker. We read code
  // back from the DOM and merge it with the payload props, so the (potentially
  // large) file text is never duplicated into the JSON payload.
  if (name === 'code-viewer') {
    return `import { hydrate, h } from 'preact';
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

function readPayload() {
  const el = document.querySelector('script[data-island-props]');
  if (!el || !el.textContent) return {};
  try { return JSON.parse(el.textContent); } catch (_) { return {}; }
}

function hydrateAll() {
  const Component = ISLAND_REGISTRY['code-viewer'];
  if (!Component) return;
  const payload = readPayload();
  document.querySelectorAll('[data-island="code-viewer"]').forEach((el) => {
    const id = el.getAttribute('data-island-id');
    const props = (id && payload[id]) || {};
    const pre = el.querySelector('pre');
    const code = pre ? pre.textContent || '' : '';
    hydrate(h(Component, { ...props, code }), el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
} else {
  hydrateAll();
}
`;
  }

  // tabs is ENHANCED, not hydrated: the panel content is arbitrary SSR HTML
  // (rendered MDX — paragraphs, code blocks, nested components), so re-rendering
  // it through Preact would be wasteful and risk a mismatch. The component
  // already SSR-rendered a fully functional ARIA tablist + panels (first tab
  // visible, rest `hidden`); this chunk just wires up switching. It is plain DOM
  // JS — it imports NEITHER preact NOR the rang registry, so the chunk stays
  // tiny. For each `[data-island="tabs"]` root we scope queries to its own tabs
  // and panels, then on click / ArrowLeft|Right / Home / End we flip
  // `aria-selected` + `tabIndex` (roving focus) on the buttons and toggle each
  // panel's `hidden`. The active visual is driven by the `aria-selected:`
  // Tailwind variant, so flipping `aria-selected` is all the restyle needs.
  if (name === 'tabs') {
    return `function enhance(root) {
  const tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  const panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
  if (tabs.length === 0) return;

  function select(idx, focus) {
    const clamped = (idx + tabs.length) % tabs.length;
    tabs.forEach(function (tab, i) {
      const active = i === clamped;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(function (panel, i) {
      panel.hidden = i !== clamped;
    });
    if (focus && tabs[clamped]) tabs[clamped].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(i, false); });
    tab.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); select(i + 1, true); break;
        case 'ArrowLeft': e.preventDefault(); select(i - 1, true); break;
        case 'Home': e.preventDefault(); select(0, true); break;
        case 'End': e.preventDefault(); select(tabs.length - 1, true); break;
      }
    });
  });
}

function enhanceAll() {
  document.querySelectorAll('[data-island="tabs"]').forEach(enhance);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceAll, { once: true });
} else {
  enhanceAll();
}
`;
  }

  // The chunk reads the per-page props payload at runtime. Each marker carries
  // `data-island-id="iN"` — we look that key up in the JSON blob.
  return `import { hydrate, h } from 'preact';
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

const NAME = ${JSON.stringify(name)};

function readPayload() {
  const el = document.querySelector('script[data-island-props]');
  if (!el || !el.textContent) return {};
  try { return JSON.parse(el.textContent); } catch (_) { return {}; }
}

function hydrateAll() {
  const Component = ISLAND_REGISTRY[NAME];
  if (!Component) return;
  const payload = readPayload();
  document.querySelectorAll('[data-island="' + NAME + '"]').forEach((el) => {
    const id = el.getAttribute('data-island-id');
    const props = (id && payload[id]) || {};
    hydrate(h(Component, props), el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
} else {
  hydrateAll();
}
`;
}
