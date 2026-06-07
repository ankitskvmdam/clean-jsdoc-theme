# Plan: `@iframe` embeds (generic iframe support, doclets + prose)

> Handoff for a future session. Decisions are **locked** (see below); this doc is
> the implementation spec. No code written yet. Sibling plans:
> [`plan-render-all-kinds.md`](./plan-render-all-kinds.md),
> [`plan-link-resolution.md`](./plan-link-resolution.md),
> [`plan-doc-groups.md`](./plan-doc-groups.md).

## Goal

Let doc authors embed an arbitrary iframe (CodePen, StackBlitz, a live demo, a
video, …) both in **doclet comments** (a generic `@iframe` block tag) and in
**Markdown prose** (README + tutorials). Render it through one Preact `Embed`
component that hydrates into an island for click-to-load + theme-sync.

## Decisions (locked this session)

1. **Generic `@iframe`** — embed any URL. No provider-specific (`@codepen`) tag;
   CodePen is just a URL the author supplies.
2. **`key=value` config syntax** (not a `{json}` object).
3. **An `embed` island** — click-to-load + theme-sync, not a static-only iframe.
4. **Both doclets and Markdown files** can render an iframe (a `@iframe` block tag
   on doclets; a fenced ```` ```iframe ```` block in prose).

## Verified mechanics (probed this session)

- **Custom tags need no JSDoc plugin.** With `tags.allowUnknownTags: true`
  (already set in `examples/basic/jsdoc.json`), `@iframe …` lands in
  `doclet.tags[]` as `{ originalTitle:'iframe', title:'iframe', text:'<raw>',
  value:'<raw>' }` with the text preserved **verbatim** — even a leading `{…}` is
  NOT parsed as a type. setu currently ignores `doclet.tags`; this feature reads it.
- **In-content islands read config from the DOM**, not the JSON props payload.
  `copy-btn` (rang `CodeBlock.tsx`) emits `<div data-island="copy-btn">` and the
  loader hydrates every `[data-island="copy-btn"]`; `code-viewer` reads its code
  from the SSR `<pre>`. The MDX-content path has no clean server-props channel
  (only dwar's `renderIsland` allocates `data-island-id`, and it's called outside
  MDX) — so `Embed` must carry its config in `data-*` attributes and read them on
  hydrate. (`packages/dwar/src/islands-loader.ts`, `packages/rang/src/components/CodeBlock.tsx`.)
- **The runtime loader auto-discovers in-content islands.** It scans
  `document.querySelectorAll('[data-island]')` and lazy-imports each present
  chunk — so dwar needs no static knowledge that an embed is on a page; the chunk
  just has to exist and have a loader snippet.
- **Prose can't use raw `<iframe>`.** `markdownToMdastBlocks` / `htmlToMdastBlocks`
  lower everything through HTML→`hast-util-to-mdast`, which drops unknown elements.
  But a fenced ```` ```iframe ```` block round-trips cleanly to an mdast `code`
  node with `lang:"iframe"` (md → `<pre><code class="language-iframe">` → back to
  a `code` node), which setu can intercept. This holds for **both** the README
  (HTML) path and the tutorial (Markdown) path.
- **JSX nodes are MDX-safe.** Emitting `<Embed …/>` as a capitalized
  `mdxJsxFlowElement` (like `<Callout>`) serializes verbatim via `mdxJsxToMarkdown`
  (setu `mdx.ts`) and compiles in dwar — no raw HTML, no stray braces tripping
  `escapeStrayBraces`.

---

## Design

### 1. Shared config parser — `packages/setu/src/embed.ts` (new)

```ts
export interface EmbedSpec {
  src: string;              // required; https only (see security)
  title?: string;           // iframe title (a11y) + poster label
  height?: number;          // px; default e.g. 400
  width?: string;           // optional; default 100%
  aspectRatio?: string;     // e.g. "16/9"; alternative to height
  allow?: string;           // iframe allow= (e.g. "fullscreen; clipboard-write")
  sandbox?: string;         // override default sandbox
  clickToLoad?: boolean;    // poster until clicked
  themed?: boolean;         // src contains a {theme} token to swap on theme change
}
export function parseEmbedConfig(text: string): EmbedSpec | null;
```

Grammar (same for the tag and the fence): the **first token is the URL**, the
rest are `key=value` pairs; values may be quoted (`title="Live demo"`). Example:

```
https://codepen.io/team/codepen/embed/PNaGbb height=400 title="Demo" clickToLoad=true
```

- Allowlist the keys above; ignore unknown keys (warn). Coerce `height`→number,
  `clickToLoad`/`themed`→boolean.
- **Security:** require `https://` (or protocol-relative `//`); reject otherwise
  and return `null` (the caller drops the embed + logs). Author-controlled input,
  but sandbox by default regardless.
- Return `null` on no/invalid URL so callers can skip cleanly.

### 2. mdast builder — `packages/setu/src/mdast/builders.ts`

Add `embed(spec: EmbedSpec): MdxJsxFlowElement` building `<Embed …/>` with string
attributes (`src`, `title`, `height`, `aspectRatio`, `allow`, `sandbox`,
`clickToLoad`, `themed`). Capitalized name so MDX routes it through rang's
component map (mirrors `callout`). `mdxJsxToMarkdown` already wired in `toMdx`.

### 3. Doclet path — `packages/setu/src/mdast/doclet.ts`

- Add `embedBlocks(doclet): RootContent[]` — for each `doclet.tags` entry with
  `title === 'iframe'`, `parseEmbedConfig(tag.value ?? tag.text)` → `embed(spec)`.
- Add `'iframes'` to the `DocletSection` union and render it in `docletBlocks`
  (place after `examples`). Skippable like the other sections.
- Flows automatically into every kind via `containerViewToMdast`'s `docletBlocks`
  call — classes, members, modules, typedefs, globals.

### 4. Prose path — `packages/setu/src/guide-view.ts` (+ a shared transform)

- Add `resolveEmbedFences(tree: Root): void` — walk mdast for `code` nodes with
  `lang === 'iframe'`, `parseEmbedConfig(node.value)` (fence body = the same
  grammar; allow it spread across lines), and replace the node in its parent with
  the `embed(spec)` JSX node. Drop the node if the config is invalid (warn).
- Run it in `buildReadmePage` and `buildTutorialPage` **after**
  `htmlToMdastBlocks` / `markdownToMdastBlocks` (so it operates on the
  post-normalization tree, before `toMdx`). Same `<Embed>` output as the doclet path.

> Prose syntax for authors:
> ````md
> ```iframe
> https://codepen.io/team/codepen/embed/PNaGbb height=400 title="Demo"
> ```
> ````

### 5. rang — `Embed` component + island

- New `packages/rang/src/components/Embed.tsx`:
  - **SSR output:** a wrapper `<div data-island="embed" data-src data-title
    data-height data-aspect data-allow data-sandbox data-click-to-load
    data-themed>`. Inside:
    - not click-to-load → the real `<iframe loading="lazy" sandbox=… allow=…
      referrerpolicy="strict-origin-when-cross-origin" title=…>` (works with no JS).
    - click-to-load → a poster `<button>` (title + "Load") **plus** a
      `<noscript><iframe …></noscript>` fallback so no-JS users still get it.
  - Sandbox default: `allow-scripts allow-same-origin allow-popups allow-forms`
    (CodePen needs these); overridable via `sandbox=`.
  - Responsive box via `aspect-ratio` (preferred) or fixed `height`.
  - Export `EmbedProps`; register `Embed` in `defaultMdxComponents`
    (`packages/rang/src/mdx-components.tsx`).
- **Island behavior** (hydration, reads `data-*` from the marker — no JSON payload):
  - **click-to-load:** on poster click, inject the `<iframe>` and remove the poster.
  - **theme-sync (generic):** when `data-themed` and `data-src` contains a
    `{theme}` token, swap the token for `light`/`dark` from `<html data-theme>` and
    re-point `iframe.src` on change via a `MutationObserver` (mirrors `CodeViewer`).
  - Add `'embed'` to `IslandName` (`packages/utils/src/site/islands.ts`) and
    `ISLAND_REGISTRY` (`packages/rang/src/islands.ts`). `IslandPropsMap.embed` can
    be `Record<string, never>` since config comes from the DOM (like `theme-toggle`).

### 6. dwar — chunk + loader snippet

- The island bundler builds `_islands/embed.js` once `'embed'` is in the registry.
- Add an `embed` hydration snippet to `packages/dwar/src/islands-loader.ts`
  modeled on the `copy-btn` one (query `[data-island="embed"]`, read `data-*`, no
  payload lookup). The runtime `[data-island]` scan already loads the chunk when
  an embed is present — no per-page static wiring needed.
- No `render()`/`SsrLayout` change: `Embed` is placed by the MDX component map,
  not by dwar chrome.

### 7. Docs + example

- `examples/basic`: add a `@iframe` tag to one doclet and a ```` ```iframe ````
  block to a tutorial; confirm both render + hydrate.
- `ARCHITECTURE.md`: note the `@iframe` tag + `iframe` fence, the `Embed`
  component, and the `embed` island (bump the island list to 11).
- Document the `allowUnknownTags: true` requirement for the `@iframe` **tag**
  (the prose fence needs nothing special).

---

## Suggested phases (sequential, one subagent each)

1. **Parser + builder** — `embed.ts` (`parseEmbedConfig`) + `builders.embed` + unit tests.
2. **Doclet path** — `embedBlocks` + `'iframes'` `DocletSection` in `docletBlocks` + tests.
3. **Prose path** — `resolveEmbedFences` in README + tutorial builders + tests.
4. **rang `Embed` component** — SSR markup + `defaultMdxComponents` registration + tests.
5. **`embed` island** — `IslandName`/`ISLAND_REGISTRY` + click-to-load + theme-sync + dwar loader snippet + tests.
6. **Example + docs + e2e** — fixture embeds, ARCHITECTURE.md, fixture build.

## Files
| File | Change |
|---|---|
| `packages/setu/src/embed.ts` | **new** — `EmbedSpec`, `parseEmbedConfig` |
| `packages/setu/src/mdast/builders.ts` | `embed(spec)` JSX-node builder |
| `packages/setu/src/mdast/doclet.ts` | `embedBlocks` + `'iframes'` `DocletSection` |
| `packages/setu/src/guide-view.ts` | `resolveEmbedFences` in README + tutorial builders |
| `packages/utils/src/site/islands.ts` | `'embed'` in `IslandName` + `IslandPropsMap` |
| `packages/rang/src/components/Embed.tsx` | **new** — SSR iframe/poster + island behavior |
| `packages/rang/src/mdx-components.tsx` | register `Embed` |
| `packages/rang/src/islands.ts` | `embed` in `ISLAND_REGISTRY` |
| `packages/dwar/src/islands-loader.ts` | `embed` hydration snippet |
| `examples/basic/**` | a `@iframe` tag + an `iframe` fence |
| `ARCHITECTURE.md` | document the feature; island count → 11 |

## Test plan
- **setu unit:** `parseEmbedConfig` (url-first, quoted values, key coercion,
  https rejection, invalid → null); `embed` builder shape; `embedBlocks` from
  `doclet.tags`; `resolveEmbedFences` swaps lang-iframe code nodes and leaves
  other fences untouched.
- **rang:** `Embed` SSR renders the marker + iframe (no-JS path) and the poster +
  `<noscript>` (click-to-load path); registered in `defaultMdxComponents`.
- **dwar:** an embed in a page emits a `_islands/embed.js` chunk and the marker
  survives compile; theme-token swap logic unit-tested where feasible.
- **e2e:** fixture build → a doclet page and a tutorial page each show a working
  iframe; click-to-load poster hydrates; toggling theme re-points a `themed` src.

## Verification
```sh
pnpm --filter @clean-jsdoc-theme/setu run test
pnpm --filter @clean-jsdoc-theme/rang run test
pnpm --filter @clean-jsdoc-theme/dwar run test
pnpm -w run typecheck
cd examples/basic && pnpm run docs && pnpm dlx serve dist
```

## Security notes
- Author-controlled input (JSDoc/Markdown source), so not untrusted — but still:
  `https://`-only, `sandbox` by default, `referrerpolicy="strict-origin-when-cross-origin"`,
  `loading="lazy"`. `clickToLoad` avoids a third-party request until the user opts in.
- If a consumer sets a CSP, embedding requires an appropriate `frame-src`; note
  this in the docs (not something the theme can set for them).

## Open follow-ups (not blocking)
- Provider shorthands (`@codepen user/hash`) could be layered on later as sugar
  over `parseEmbedConfig` if desired — explicitly out of scope per decision 1.
- A poster thumbnail (`poster=<url>`) for click-to-load could improve UX.
