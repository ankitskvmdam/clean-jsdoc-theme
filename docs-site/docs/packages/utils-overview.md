---
title: Overview
group: Packages/utils
order: 10
---

# `@clean-jsdoc-theme/utils`

`@clean-jsdoc-theme/utils` is the shared contract every other package in the
pipeline imports. It defines the **type boundary between setu and dwar**, the
**slug rules** both sides use so nav links and heading anchors always agree, and
the pure **opts-validation + build-report** logic the entry-point bridges run.

It contains no rendering and no I/O — just the interfaces, the Zod schemas, and
a handful of small pure functions that the rest of the system is built around.

> If you just want to use the theme, you never install this package. It's an
> internal building block. See the [Packages](/packages) landing page for the
> pieces you actually install, and [Configuration](/configuration) for options.

## Why it's a separate package

The whole pipeline is deliberately one-way — setu turns doclets into a
`SiteManifest`, dwar renders that manifest — and the two halves must never grow
a hidden coupling. Pulling the boundary types into their own package gives the
project two things:

- **One source of truth for the boundary.** setu emits a `SiteManifest`, dwar
  consumes the *same* `SiteManifest` type, and neither imports the other. The
  shape is defined once here so the build side and the render side can't drift.
  You can see this in the boundary barrel,
  [`site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts),
  whose own doc comment calls it "the boundary contract between setu (build) and
  dwar (render)."
- **Browser-safe, so rang can import it too.** The Preact component library
  (rang) runs in the browser, so the contract it shares has to be node-free. The
  slug rules, base-path helpers, diagnostics model, and build-report formatter
  here use only web-platform globals (`URL`, `TextEncoder`, `fetch`,
  `AbortController`) — never `fs`, `Buffer`, or `node:*`. The only networked
  dependency (Google Fonts existence) and the only node-only dependency (gzip
  sizing) are **injected** by the caller rather than imported, which is what
  keeps the package importable in a browser.

The top barrel,
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts),
re-exports everything, and `package.json` exposes a single entry point — so
every consumer imports from `@clean-jsdoc-theme/utils` (there are no subpath
exports).

## What's inside

The package splits into two surfaces: the `site/` contracts and the `config/`
logic, plus the JSDoc doclet schema.

### `site/` — the setu ↔ dwar contract

The boundary objects and the rules both sides must share. Verified exports
include:

- **`SiteManifest`, `Page`, `NavNode`, `SearchEntry`** — what setu hands to
  dwar: the pages, the nav tree, the search index, and a `buildId` for cache
  busting. The manifest is self-contained on purpose: dwar should never re-read
  the doclet database.
  ([`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts),
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`Frontmatter`, `PageKind`, `Heading`** — per-page metadata, the page kind
  (`class`, `module`, `guide`, `source`, …) that drives layout, and the
  pre-extracted headings the TOC island renders.
  ([`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`RenderOptions`, `RenderResult`, `OutputFile`, `RenderError`** — the input
  and output of `dwar.render`. `render()` is pure and returns files in memory;
  the doc comment notes there is intentionally no `embedSearchIndex` flag.
  ([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))
- **`ThemeConfig`, `ThemeTokens`, `ThemeColors`, `ComponentOverrides`** — the
  theme contract: color tokens, fonts, Shiki themes, component slot overrides,
  base path, copy-page and prev/next config, custom CSS/JS.
  ([`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts))
- **`SiteName`, `SiteLogo`** plus the helpers `siteNameText()` and
  `resolveSiteLogo()` — the plain-text-or-logo-set site identity.
  ([`site-name.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/site-name.ts))
- **`IslandName`, `IslandPropsMap`** — the registry of interactive islands
  (`sidebar`, `toc`, `cmdk`, `copy-page`, …) and the type-safe prop bag for
  each, shared between server render and hydration.
  ([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts))
- **`slugifyHeading()`, `slugifyPath()`, `slugifySourcePath()`** — the
  GitHub-style slug rules. Both setu (sidebar / TOC generation) and dwar
  (rendered anchor IDs) import from here so anchors and links always match;
  the file calls this out as addressing "Risk R4."
  ([`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts))
- **`normalizeBasePath()`, `withBase()`** — pure, browser-safe, fail-safe
  helpers for serving the site from a sub-directory.
  ([`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts))

### `config/` — pure opts validation + build report

The logic the entry-point bridges run before and after a build:

- **`validateThemeOpts()`** — the orchestrator. Takes a raw opts object, runs
  the `siteName` and `fonts` validators plus an unknown-key policy into a single
  `DiagnosticBag`, and returns normalized values. Never throws — strict-mode
  enforcement is the caller's job via `diagnostics.hasErrors()`.
  ([`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts))
- **`DiagnosticBag`, `Diagnostic`, `formatDiagnostics()`** — the reporting
  spine: a structured, level-tagged (`error` / `warning` / `info`) finding model
  that's pure and node-free.
  ([`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts))
- **`createGoogleFontResolver()`, `FontResolver`, `FontExistence`,
  `FetchLike`** — the *injection* pattern that keeps utils browser-safe. The
  one networked check (does this Google Font exist?) is built around an injected
  `fetch` and is **fail-open**: anything ambiguous resolves to `'unknown'` so an
  offline build never breaks.
  ([`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts))
- **`formatBuildReport()`** — the Next.js-style build summary. Byte sizes come
  from `TextEncoder` (never `Buffer`); gzip sizing is an *injected* `gzipSizer`,
  again so utils stays node-free.
  ([`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts))
- **The Zod schemas** — `THEME_OPT_KEYS`, `SiteNameSchema`, `FontsSchema`,
  `MenuSchema`, `CopyPageConfigSchema`, and friends — the recognized
  theme-option surface, expressed as Zod so failures carry a structured
  `path` + `message`.
  ([`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts))

### The doclet schema

`doclet-schema.ts` (`TDoclet` and friends) and `salty.ts`
(`TJSDocSaltyCollection`) carry the JSDoc-side types that setu reads. These are
re-exported from the top barrel too, so setu's doclet processing imports them
from the same package.

## How the injection pattern works

This is the detail that lets a config package stay browser-safe. utils never
imports `fetch` or `zlib`; the caller passes them in:

- `validateThemeOpts({ … fontResolver })` takes a resolver the bridge builds
  with `createGoogleFontResolver()`. Without it, font existence checks are
  skipped gracefully and the build proceeds.
- `formatBuildReport({ … gzipSizer })` takes the gzip function. The gzip column
  appears only when a sizer is supplied; the bridge passes
  `(b) => zlib.gzipSync(b).length`.

Both `google-fonts.ts` and `report.ts` state this in their module doc comments:
the networked / node-only dependency "is never imported, only the optional
[resolver/sizer] injected by the caller."

## Read the source

The maintainer wants you sent to the code — start here:

- **Package directory:**
  [packages/utils](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils)
  ·
  [packages/utils/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils/src)
- **Barrels:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
  ·
  [`src/site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  (the boundary barrel) ·
  [`src/config/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/index.ts)
- **The contracts:**
  [`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
  ·
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)
  ·
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  ·
  [`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
  ·
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts)
  ·
  [`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
- **The config logic:**
  [`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)
  ·
  [`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts)
  ·
  [`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)
  ·
  [`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts)
  ·
  [`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts)

## Next

- [utils Examples](/packages/utils-examples) — concrete snippets using these types.
- [setu Overview](/packages/setu-overview) — the package that *produces* the
  `SiteManifest`.
- [dwar Overview](/packages/dwar-overview) — the package that *consumes* it.
