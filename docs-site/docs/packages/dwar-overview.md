---
title: Overview
group: Packages/dwar
order: 40
---

# `@clean-jsdoc-theme/dwar`

`@clean-jsdoc-theme/dwar` owns the second half of the theme's pipeline: it is the
**pure renderer**. Hand it a `SiteManifest` and it server-renders every page to
HTML, bundles the interactive islands, emits the stylesheet and the search index,
and returns all of that as in-memory files. It is the render-side counterpart to
[setu](/packages/setu-overview), which produces the manifest.

The single entry point is
[`render(manifest, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts):

```ts
function render(manifest: SiteManifest, opts: RenderOptions): Promise<RenderResult>;
```

> If you just want to use the theme, you never install this package directly —
> the JSDoc and TypeDoc bridges call it for you. It's an internal building block.
> See the [Packages](/packages) landing page for what you actually install, and
> [dwar Examples](/packages/dwar-examples) for the real call shape.

## Why dwar exists

A documentation build has two genuinely different jobs: **understanding the
symbols** and **rendering pixels**. setu does the first; dwar does the second.
The split lets the renderer be the one place that knows about Preact, MDX,
Shiki, esbuild, and the HTML shell — while staying ignorant of how doclets were
walked or how the sidebar was shaped. dwar consumes **only the `SiteManifest`**;
it never re-reads the doclet database.

`render`
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
is the engine) does the following, in order:

- **Builds the stylesheet** — theme variables derived from `theme.tokens` plus a
  pre-compiled Tailwind utility layer, stamped with `manifest.buildId` for
  cache-busting
  ([`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts),
  `buildThemeVariableCss` + the inlined `UTILITY_CSS`).
- **Bundles the islands up front** in **one split esbuild build** — every island
  is an entry point and `splitting: true` hoists shared code (Preact, rang's
  registry) into a separate `chunk-<hash>.js` that each entry imports via
  relative ESM. Every emitted file is content-hashed (`[name]-[hash].js`)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)).
- **Renders each page** — compiles its MDX body to a Preact component, composes
  it into rang's layout, and serializes it to an HTML document
  ([`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts),
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx),
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)).
  Pages are rendered with bounded concurrency (a worker pool capped at
  `min(8, cpus-1)`) but assembled back in original page order, so the output is
  deterministic.
- **Emits the fuzzy-search index** — a JSON file (one entry per page plus
  member/method deep-links) that the `cmdk` command-palette island fetches at
  runtime. This is separate from Pagefind's full-text bundle.

### Source pages skip MDX

A page whose frontmatter is `kind: 'source'` is a whole-file viewer, not prose.
dwar skips the MDX compile entirely for it and mounts a `code-viewer` island
instead: the SSR `<pre>` carries the file text, while the JSON props payload
deliberately omits the code (the hydration chunk reads it back from the DOM).
Source pages are `hidden`, so they contribute nothing to the search index
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
the `renderPage` source branch).

## The guarantees (verified in source)

These are the two properties that define dwar, and both hold in the code.

### `render()` is pure

dwar does **not** write to disk. `render` allocates an array of `OutputFile`s in
memory and returns them; the caller persists them. There is no `fs` write, no
`process.cwd()`, no logging in the render path. The module docstring states it
outright: *"`render()` is pure: it returns an in-memory `RenderResult`."*

Two carefully-scoped exceptions prove the rule, and neither breaks purity for the
default path:

- **`runPagefindAgainstDir`** is the **only** filesystem touch in the package,
  and it is a *separate, post-write* function — never called from `render`. It
  operates on a directory of already-written HTML and emits the Pagefind bundle
  under `<dir>/pagefind/`
  ([`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)).
- **`opts.islandCacheDir`** is opt-in. When (and only when) a bridge supplies it,
  the esbuild island bundle is read/written from an on-disk cache; omit it — the
  default — and bundling stays in memory. Reading `os.cpus()` to size the worker
  pool is explicitly noted as *not* breaking the contract (it's about no
  fs/cwd/logging)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts),
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts) options).

### `render()` is resilient

A single page that fails to compile (e.g. unparseable MDX) does **not** abort the
build. Each page renders inside a `try/catch`: on failure the page is skipped and
captured as a `{ slug, message }` entry in `result.errors`, and the rest of the
site still renders. The error is *reported*, never *thrown* — the bridges log the
skipped pages as a warning after the build report
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
the `task` closure;
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
surfaces them).

## What `render()` emits

Everything comes back inside `result.files` (a `OutputFile[]`, each
`{ path, contents }` with a forward-slash path relative to the destination root):

- **Per-page HTML** — `<slug>/index.html` (the root/empty slug → `index.html`),
  the full document shell from
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts).
- **A co-located companion `.md`** for each content page — the page's MDX body
  written **verbatim** (`<slug>/index.md`), so LLMs and the copy-page button can
  fetch the Markdown source for the current page. Source-viewer pages have no
  body and emit none.
- **One stylesheet** — the theme-variable + utility CSS, build-id stamped.
- **The fuzzy-search index** — `_assets/search-index.<buildId>.json`, page
  entries plus member deep-links.
- **The island bundles** — the content-hashed entry chunks plus the shared chunk,
  under `_islands/`.
- **A per-page JSON props payload** — embedded in each HTML document as
  `<script type="application/json" data-island-props>`, read by the inline island
  loader at hydration time
  ([`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts),
  `buildIslandsPropsPayload`).

Alongside `files`, `RenderResult` carries `search` (the per-page entries, for any
caller that wants them), an optional `errors` array (present only when a page
failed), and a `stats` block (`pageCount`, `assetCount`, `cssBytes`, `jsBytes`,
`durationMs`)
([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)).

> There is intentionally **no `embedSearchIndex` flag**. Full-text search is the
> separate `runPagefindAgainstDir` post-write step — the renderer never inlines a
> Pagefind bundle.

## Dependencies

dwar depends on the three sibling packages it sits downstream of, plus the render
toolchain
([`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/package.json)):

- **`@clean-jsdoc-theme/utils`** — the boundary types (`SiteManifest`,
  `RenderOptions`, `RenderResult`, `OutputFile`, …); see
  [utils Overview](/packages/utils-overview).
- **`@clean-jsdoc-theme/setu`** — the manifest generator (used by the smoke
  script); see [setu Overview](/packages/setu-overview).
- **`@clean-jsdoc-theme/rang`** — the Preact components and island registry dwar
  bundles and composes; see [rang Overview](/packages/rang-overview).
- **`preact` / `preact-render-to-string`** for SSR, **`@mdx-js/mdx`** +
  **`@shikijs/rehype`** / **`shiki`** for the MDX compile + highlighting,
  **`esbuild`** for the island bundle, and **`pagefind`** (optional) for the
  post-write index.

## Read the source

The maintainer wants you sent to the code — start here:

- **Package directory:**
  [packages/dwar](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar)
  ·
  [packages/dwar/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar/src)
- **The entry point + the purity/resilience logic:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
  (`render`, the per-page `try/catch`, the source-page branch)
- **The option + result types:**
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  (`RenderOptions`, `RenderResult`, `OutputFile`, `RenderError`)
- **The HTML shell:**
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  (`renderHtmlDocument`, `htmlPathFor`, `mdPathFor`, the props payload)
- **The layout seam:**
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  (`SsrLayout`, composing rang's slots + the island markers)
- **MDX compile:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts)
  (`compileMdxToComponent`, `collectUsedLangs`)
- **The island bundle:**
  [`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  (the split esbuild build) and
  [`islands-loader.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-loader.ts)
- **The CSS pipeline:**
  [`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts)
- **The (only) filesystem touch:**
  [`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)
  (`runPagefindAgainstDir`)
- **The runnable example:**
  [`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)

## Next

- [dwar Examples](/packages/dwar-examples) — the runnable smoke script and the
  real call shape from the two bridges.
- [setu Overview](/packages/setu-overview) — where the `SiteManifest` dwar
  consumes comes from.
- [rang Overview](/packages/rang-overview) — the components and islands dwar
  bundles.
- [Configuration](/configuration) — the `theme` options that drive a render.
