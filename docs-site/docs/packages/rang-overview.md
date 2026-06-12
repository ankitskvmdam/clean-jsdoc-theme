---
title: Overview
group: Packages/rang
order: 30
---

# `@clean-jsdoc-theme/rang`

`@clean-jsdoc-theme/rang` is the **Preact component library** that
[dwar](/packages/dwar-overview) server-renders and bundles. It owns every byte
of page-shell HTML — the [`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx),
[`Header`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx),
and [`Footer`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx) —
the hydratable **islands** that add progressive enhancement, the MDX element →
component map, and the shadcn-style primitives styled with Tailwind utilities
that reference CSS variables.

The package depends only on the browser-safe contract package
([`@clean-jsdoc-theme/utils`](/packages/utils-overview)) plus
[`preact`](https://preactjs.com/), [`class-variance-authority`](https://cva.style/),
[`clsx`](https://github.com/lukeed/clsx),
[`tailwind-merge`](https://github.com/dcastil/tailwind-merge), and
[`lucide-preact`](https://github.com/lucide-icons/lucide) — see
[`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/package.json).

> If you just want to use the theme, you never install this package. It's an
> internal building block that dwar bundles for you. See the
> [Packages](/#the-packages) section for the pieces you actually install.

## Why it's a separate package

The pipeline is deliberately split: setu produces a `SiteManifest`, dwar renders
it, and **all the markup lives in rang**. Pulling the component layer into its
own package buys the project a clean seam:

- **rang owns the markup; dwar owns the orchestration.** dwar's
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  adds **no chrome of its own** — its `SsrLayout` composes rang's `Layout`
  through its `headerControls` / `sidebar` / `toc` / `tocMobile` slots and does
  nothing but wrap each interactive component in a `<div data-island="…">`
  hydration marker. As that file's own doc comment puts it: *"The chrome markup
  (header, grid shell, asides, footer) lives entirely in rang's `Layout`. dwar's
  only job here is hydration."*
- **Browser-safe by construction.** Components run in the browser, so rang only
  imports the node-free [`utils`](/packages/utils-overview) contract — never the
  build side. The same components render to a string on the server
  (`preact-render-to-string`) and hydrate in the browser.
- **One styling convention.** Components style themselves with Tailwind utility
  classes that reference CSS variables (e.g. `bg-background`,
  `text-(--clean-fg)`, `border-(--clean-border)`). dwar plumbs the theme tokens
  into those variables on `:root`, so the same markup re-themes without a
  recompile. See
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
  — the shadcn `cn()` helper that composes `clsx` + `tailwind-merge` so a
  caller-supplied class always wins a Tailwind conflict.

## Chrome vs. islands

This is the central distinction in rang.

**Chrome** is pure, static SSR markup with no client JavaScript. The
[`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
shell — header + a 3-column grid (sidebar · main · toc) + footer — never
references an island itself. It renders whatever nodes the caller drops into its
slots. `Header`, `Footer`, and `Brand` are likewise static.

**Islands** are the interactive pieces. They render as plain HTML on the server,
then dwar mounts a small per-island JS chunk that hydrates *just that subtree* —
progressive enhancement, not a whole-page SPA. The full set of islands is the
authoritative `ISLAND_REGISTRY` in
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts),
a `Record<IslandName, ComponentType>` keyed by the island name dwar marks the
DOM with:

| Island name (`IslandName`) | Component |
| --- | --- |
| `sidebar` | `Sidebar` |
| `mobile-nav` | `MobileNav` |
| `toc` | `TOC` |
| `toc-mobile` | `TocPopover` |
| `cmdk` | `CtrlK` |
| `code-tabs` | `CodeTabs` |
| `code-viewer` | `CodeViewer` |
| `embed` | `EmbedBody` |
| `copy-btn` | `CopyBtn` |
| `copy-page` | `CopyPageButton` |
| `theme-toggle` | `ThemeToggle` |
| `settings` | `Settings` |
| `tabs` | `Tabs` |

Two of those entries are worth a note, straight from the registry's own
comments:

- **`embed`** maps to `EmbedBody` (not the `Embed` MDX wrapper): the loader
  mounts `EmbedBody` onto the `data-island="embed"` marker and reads its config
  from the marker's `data-*` attributes.
- **`tabs`** is fully SSR-rendered — the `Tabs` markup (ARIA tablist + panels)
  is emitted on the server and only **DOM-enhanced** on the client (the panel
  content is arbitrary SSR HTML, so it's enhanced, not re-hydrated). Its entry
  exists *"purely to satisfy `Record<IslandName, …>`."*

A third group is **SSR-only and not islands**:
[`Steps`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
/ `Step` (a static numbered stepper) and
[`PageNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/PageNav.tsx)
(the prev/next pager) are pure markup with no client JS — they are exported and
used in MDX/layout, but they never appear in `ISLAND_REGISTRY`. Heading anchors
are similar: the markup is SSR-only and a delegated inline script handles the
click (see
[`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)).

## The MDX element map

When dwar compiles a page's MDX, it renders it with rang's
`defaultMdxComponents` — the element-name → component registry in
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx).
It maps the intrinsic tags MDX emits (`h1`–`h6`, `a`, `img`, `p`, `pre`, `code`,
lists, `blockquote`, tables, `hr`) onto styled renderers from
[`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
and
[`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx),
plus the **capitalized** components setu emits so they route through the map:
`Callout`, `Embed`, `SourceLink`, `MemberMeta`, `MemberHeading`, `Steps` /
`Step`, and `Tabs` / `Tab`. (For the user-facing side of these, see
[Callouts](/authoring/callouts) and [Tabs](/authoring/tabs).)

## How dwar consumes it

dwar imports rang both at render time and at bundle time:

- **SSR.**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  imports rang's `Layout` and the chrome islands (`Sidebar`, `MobileNav`, `TOC`,
  `TocPopover`, `CtrlK`, `ThemeToggle`, `Settings`), wraps each in a
  `data-island` marker via `renderIsland`, records its props for the per-page
  payload, and hands the wrapped nodes to `Layout`'s slots.
- **Hydration.**
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  runs a single split esbuild build with every island as an entry point.
  esbuild hoists the code shared across entries (Preact, rang's registry, shared
  helpers) into one `chunk-<hash>.js` that each island chunk imports — which is
  what cuts the emitted `_islands/` payload from ~4.74 MB to ~0.40 MB. The
  island sources import `@clean-jsdoc-theme/rang` from dwar's own
  `node_modules`.

## Read the source

The maintainer wants you sent to the code — start here:

- **Package directory:**
  [packages/rang](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang)
  ·
  [packages/rang/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang/src)
- **The public barrel:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
- **The two registries:**
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
  (the island name → component map) ·
  [`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
  (the MDX element → component map)
- **The chrome:**
  [`Layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
  ·
  [`Header.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)
  ·
  [`Footer.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx)
- **The MDX renderers + styling helper:**
  [`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
  ·
  [`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)
  ·
  [`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
  ·
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
- **How dwar uses it:**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  ·
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)

## Next

- [rang Examples](/packages/rang-examples) — concrete snippets using these exports.
- [dwar Overview](/packages/dwar-overview) — the package that renders and bundles rang.
- [utils Overview](/packages/utils-overview) — the browser-safe contract rang imports.
