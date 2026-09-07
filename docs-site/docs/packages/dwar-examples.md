---
title: Examples
group: Packages/dwar
order: 41
---

# dwar Examples

dwar is **internal**. You don't call `render` in a normal docs build — the JSDoc
and TypeDoc bridges call it for you. You reach for it directly only when you're
building a *custom bridge*, or when you want to see the renderer in isolation.

The best starting point is the package's own runnable example: the **smoke
script**. It exercises the whole `dwar → disk` path against a hand-authored
manifest, and because it's real code that runs, it's the most honest example in
this doc.

If you just want to configure the theme, see [Configuration](/theme/configuration)
instead.

## Run the smoke script

```bash
pnpm --filter @clean-jsdoc-theme/dwar run smoke
```

[`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
builds a small `SiteManifest` by hand — an index page, a guide with headings and
code fences, an API page, and a `kind: 'source'` viewer — hands it to dwar's
`render()`, and **writes** the returned files into `packages/dwar/preview/`. It
exists for visual sanity-checking.

The manifest is hand-authored on purpose: dwar must not depend on setu (the
setu→dwar boundary is one-way). The full `setu → dwar → disk` path is exercised
end-to-end by [`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic).

The flow, end to end, is: **manifest in → files out → you write them → preview/**.

## The `render(manifest, opts)` call

`render` takes the `SiteManifest` and a `RenderOptions`. The only required field
of `RenderOptions` is `theme`; everything else is optional. The smoke script uses
the minimal form
([`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)):

```ts
import { render } from '@clean-jsdoc-theme/dwar';
import type { ThemeConfig } from '@clean-jsdoc-theme/dwar';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';

const theme: ThemeConfig = {
  tokens: {
    colors: { bg: '#ffffff', bgMuted: '#f3f4f6', fg: '#0f172a', /* … */ border: '#e5e7eb' },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

const manifest: SiteManifest = {
  buildId: 'smoke',
  pkg: { name: 'clean-jsdoc-theme', version: '…' },
  nav: [{ label: 'Home', slug: 'index' }],
  pages: [{ slug: 'index', frontmatter: { title: 'Home', kind: 'index' }, body: 'Hello.\n' }],
};

const result = await render(manifest, { theme });
//                              ^ only `theme` is required
```

### The `RenderOptions` fields dwar reads

Every field below is on `RenderOptions` in
[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
— nothing is invented.

| Field | Required | What it does |
| --- | --- | --- |
| `theme` | **yes** | The `ThemeConfig` — `tokens` (colors, fonts, shiki, `siteName`, …), `basePath`, and the optional `copyPage` / `pageNav` / `aiPrompt` / `customCss(File)` / `customJs(File)` knobs the render reads. |
| `destination` | no | The destination directory. Used **only** for path resolution context — dwar never writes there itself. |
| `islandCacheDir` | no | Opt-in on-disk cache for the esbuild island bundle. Supplying it lets a warm rebuild skip the ~0.4s bundle step; omitting it keeps `render()` pure. The bridges pass `<project>/node_modules/.cache/clean-jsdoc-theme`. |
| `inlineSvgs` | no | Map from a doc-image `src` to that SVG's raw markup, so rang inlines theme-aware SVGs instead of `<img>`-ing them. The bridge reads the files; `render()` just looks them up. |

The bridges build a fuller `theme` (palette overrides, fonts, `copyPage`,
`pageNav`, custom CSS/JS hrefs) and pass all four options, but the contract is the
same: `theme` is required, the rest is what the bridge happened to find.

## What `RenderResult` contains, and how a bridge persists it

`render` resolves to a `RenderResult`
([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)):

```ts
interface RenderResult {
  files: OutputFile[];        // { path, contents } — everything to write
  search?: SearchEntry[];     // per-page entries (the JSON index is already in `files`)
  errors?: RenderError[];     // { slug, message } — pages skipped, present only on failure
  stats: {
    pageCount: number;        // pages rendered successfully (excludes errors)
    assetCount: number;       // non-HTML files (CSS + JS chunks + search index)
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}
```

The purity contract in practice: **`render()` returns files in memory; you write
them.** The smoke script does exactly that — a plain write loop
([`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)):

```ts
const result = await render(manifest, { theme });

// Fresh output dir, then write every OutputFile (string or Uint8Array).
await rm(previewDir, { recursive: true, force: true });
await mkdir(previewDir, { recursive: true });
for (const file of result.files) {
  const out = resolve(previewDir, file.path);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents));
}
```

The real bridges follow the identical shape. The JSDoc bridge
([`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts))
calls `render`, then concatenates dwar's files with the assets *it* copied
(logos, custom CSS/JS, doc images) and writes them all:

```ts
const result = await render(manifest, {
  theme: { ...resolveTheme(opts, siteName, fonts, basePath), ...customAssets.theme },
  destination: absoluteDestination,
  islandCacheDir,
  inlineSvgs,
});

const outputFiles = [...result.files, ...logoFiles, ...customAssets.files, ...docImageFiles];
await writeOutputFiles(absoluteDestination, outputFiles);

// Render failures are reported, never fatal.
if (result.errors && result.errors.length > 0) {
  for (const e of result.errors) console.warn(`  - ${e.slug}: ${e.message}`);
}
```

The TypeDoc bridge
([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
does the same thing in ESM: `render(manifest, { theme, destination, islandCacheDir })`,
then `writeOutputFiles`. Both treat the `errors` array as a warning.

> Note the division of labor in the write loop: **dwar's `result.files`** are the
> HTML, the companion `.md`, the stylesheet, the island chunks, and the
> fuzzy-search JSON. The **logos, custom CSS/JS, and doc images** are copied by
> the *bridge* (the I/O layer) and concatenated in — that's why `render()` stays
> pure and just links the resulting hrefs.

## The contract, restated

- `render(manifest, opts)` is **pure** — it allocates files in memory and returns
  them. It never writes to disk. The one exception is the opt-in island-bundle
  cache (`islandCacheDir`); omit it and `render()` touches no disk at all.
- **You** write `result.files` to the destination.
- Search needs no post-write step: the fuzzy index is already one of
  `result.files` (`_assets/search-index.<buildId>.json`), and the `cmdk` island
  fetches it at runtime.

## Read the source

These are the canonical, working usages — read them rather than trusting any
snippet above:

- **The runnable example:**
  [`packages/dwar/scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
  — hand-authored manifest → `render` → write loop.
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — the `render` call, the combined write, and the error handling.
- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — the same path, ESM all the way.
- **The option + result types:**
  [`packages/utils/src/site/render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
- **The entry point:**
  [`packages/dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)

## Next

- [dwar Overview](/packages/dwar-overview) — why dwar exists, the purity and
  resilience guarantees, and what `render()` emits.
- [setu Overview](/packages/setu-overview) — where the `SiteManifest` comes from.
- [rang Overview](/packages/rang-overview) — the components and islands dwar
  bundles into the page.
