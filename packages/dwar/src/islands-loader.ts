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

const ALL_ISLAND_NAMES: IslandName[] = [
  'cmdk',
  'code-tabs',
  'copy-btn',
  'settings',
  'sidebar',
  'theme-toggle',
  'toc',
];

/**
 * Build the inline loader script. The script knows the path to every island
 * chunk so callers can lazily resolve any island found on the page. It only
 * imports chunks whose markers actually exist in the DOM — pages without (say)
 * `code-tabs` don't pay for that chunk.
 *
 * The `islandNames` argument is currently unused (we always reference all
 * names so the resolver works uniformly), but is kept as a hook for future
 * per-page bundling optimizations.
 */
export function getIslandsLoaderScript(
  _islandNamesOnPage: IslandName[],
  islandsBase: string,
): string {
  const base = islandsBase.endsWith('/') ? islandsBase : `${islandsBase}/`;
  const importsArray = ALL_ISLAND_NAMES.map((n) =>
    JSON.stringify(`${base}${n}.js`),
  ).join(',');
  return [
    `(function(){`,
    `var seen=new Set();`,
    `document.querySelectorAll('[data-island]').forEach(function(el){seen.add(el.getAttribute('data-island'));});`,
    `var all=[${importsArray}];`,
    `all.forEach(function(src){var name=src.split('/').pop().replace(/\\.js$/,'');if(seen.has(name)){import(src);}});`,
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
