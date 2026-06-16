---
title: 概要
group: Packages/rang
order: 30
---

# `@clean-jsdoc-theme/rang`

`@clean-jsdoc-theme/rang` は、[dwar](/packages/dwar-overview) が server-render
して bundle する **Preact component library** です。page-shell HTML の1バイトまで
すべてを所有します — [`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)、
[`Header`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)、
[`Footer`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx) —
progressive enhancement を加える hydratable な **islands**、MDX element →
component map、そして CSS variables を参照する Tailwind utilities で styled された
shadcn 風 primitives です。

> [!NOTE]
> **なぜこの名前なのか?** *rang* (रंग) はヒンディー語/サンスクリット語で
> **色 (color)** を意味します。theme の視覚的な surface 全体 — layout、components、
> styling — を所有する package にふさわしい名前です。

この package は browser-safe な contract package
([`@clean-jsdoc-theme/utils`](/packages/utils-overview)) のみに依存し、加えて
[`preact`](https://preactjs.com/)、[`class-variance-authority`](https://cva.style/)、
[`clsx`](https://github.com/lukeed/clsx)、
[`tailwind-merge`](https://github.com/dcastil/tailwind-merge)、
[`lucide-preact`](https://github.com/lucide-icons/lucide) に依存します — 詳しくは
[`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/package.json)
を参照してください。

> theme を使いたいだけなら、この package を install することは決してありません。
> これは dwar があなたの代わりに bundle する内部的な building block です。実際に
> install する部分については [Packages](/#the-packages) セクションを参照して
> ください。

## なぜ独立した package なのか

pipeline は意図的に分割されています。setu が `SiteManifest` を生成し、dwar が
それを render し、そして **すべての markup は rang に存在します**。component layer
を独立した package に切り出すことで、project はきれいな継ぎ目 (seam) を得ます。

- **rang は markup を所有し、dwar は orchestration を所有する。** dwar の
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  は **独自の chrome を一切** 加えません — その `SsrLayout` は rang の `Layout` を
  `headerControls` / `sidebar` / `toc` / `tocMobile` の slots を通じて composition
  し、各 interactive component を `<div data-island="…">` hydration marker で
  ラップする以外には何もしません。その file 自身の doc comment が言うように:
  *"The chrome markup (header, grid shell, asides, footer) lives entirely in
  rang's `Layout`. dwar's only job here is hydration."*
- **構造的に browser-safe。** Components は browser 上で動くため、rang は
  node-free な [`utils`](/packages/utils-overview) contract のみを import します
  — build 側は決して import しません。同じ components が server 上では string へ
  render され (`preact-render-to-string`)、browser 上で hydrate されます。
- **単一の styling convention。** Components は CSS variables を参照する Tailwind
  utility classes で自身を style します (例: `bg-background`、`text-(--clean-fg)`、
  `border-(--clean-border)`)。dwar はそれらの variables へ theme tokens を
  `:root` 上に plumb するため、同じ markup が recompile なしで再 theme されます。
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
  を参照してください — `clsx` + `tailwind-merge` を composition する shadcn の
  `cn()` helper で、caller が供給した class が常に Tailwind の conflict に勝ちます。

## Chrome と islands

これが rang における中心的な区別です。

**Chrome** は純粋で static な SSR markup であり、client JavaScript を一切
含みません。
[`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
shell — header + 3-column grid (sidebar · main · toc) + footer — はそれ自体が
island を参照することは決してありません。caller がその slots に落とし込んだ
nodes をそのまま render します。`Header`、`Footer`、`Brand` も同様に static です。

**Islands** は interactive な部分です。server 上では plain HTML として render され、
その後 dwar が小さな island ごとの JS chunk を mount し、*その subtree だけ* を
hydrate します — whole-page の SPA ではなく progressive enhancement です。islands
の完全な集合は、
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
内の authoritative な `ISLAND_REGISTRY` です。これは dwar が DOM に mark する
island name を key とした `Record<IslandName, ComponentType>` です。

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

これらの entries のうち2つは、registry 自身の comments から、注記に値します。

- **`embed`** は `EmbedBody` に map されます (`Embed` MDX wrapper ではありません):
  loader は `EmbedBody` を `data-island="embed"` marker 上に mount し、その config
  を marker の `data-*` attributes から読み取ります。
- **`tabs`** は完全に SSR-rendered です — `Tabs` markup (ARIA tablist + panels)
  は server 上で emit され、client 上では **DOM-enhanced** されるだけです (panel
  の content は任意の SSR HTML なので、re-hydrate ではなく enhance されます)。
  その entry は *"purely to satisfy `Record<IslandName, …>`"* のために存在します。

第3のグループは **SSR-only であり islands ではありません**:
[`Steps`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
/ `Step` (static な numbered stepper) と
[`PageNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/PageNav.tsx)
(prev/next pager) は client JS のない純粋な markup です — export されて
MDX/layout で使われますが、`ISLAND_REGISTRY` には決して現れません。Heading
anchors も似ています: markup は SSR-only で、delegated な inline script が click
を処理します (
[`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)
を参照)。

## MDX element map

dwar が page の MDX を compile するとき、それを rang の `defaultMdxComponents` で
render します — これは
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
にある element-name → component registry です。MDX が emit する intrinsic tags
(`h1`–`h6`、`a`、`img`、`p`、`pre`、`code`、lists、`blockquote`、tables、`hr`) を
[`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
と
[`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
の styled renderers に map し、加えて setu が emit する **capitalized** な
components を map に通します: `Callout`、`Embed`、`SourceLink`、`MemberMeta`、
`MemberHeading`、`Steps` / `Step`、そして `Tabs` / `Tab`。(これらの user-facing な
側面については、[Callouts](/components/callouts) と [Tabs](/components/tabs) を
参照してください。)

## dwar はどのように consume するか

dwar は rang を render 時と bundle 時の両方で import します。

- **SSR.**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  は rang の `Layout` と chrome islands (`Sidebar`、`MobileNav`、`TOC`、
  `TocPopover`、`CtrlK`、`ThemeToggle`、`Settings`) を import し、各々を
  `renderIsland` を介して `data-island` marker でラップし、per-page payload 用に
  その props を記録し、ラップした nodes を `Layout` の slots に渡します。
- **Hydration.**
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  は、すべての island を entry point とする単一の split esbuild build を実行します。
  esbuild は entries 間で共有される code (Preact、rang の registry、共有 helpers)
  を1つの `chunk-<hash>.js` に hoist し、各 island chunk がそれを import します —
  これが emit される `_islands/` payload を約 4.74 MB から約 0.40 MB に削減する
  仕組みです。island sources は `@clean-jsdoc-theme/rang` を dwar 自身の
  `node_modules` から import します。

## source を読む

maintainer はあなたを code へ送りたいと考えています。ここから始めてください。

- **Package directory:**
  [packages/rang](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang)
  ·
  [packages/rang/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang/src)
- **public barrel:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
- **2つの registries:**
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
  (island name → component map) ·
  [`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
  (MDX element → component map)
- **chrome:**
  [`Layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
  ·
  [`Header.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)
  ·
  [`Footer.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx)
- **MDX renderers + styling helper:**
  [`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
  ·
  [`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)
  ·
  [`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
  ·
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
- **dwar がどう使うか:**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  ·
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)

## 次へ

- [rang Examples](/packages/rang-examples) — これらの exports を使った具体的な snippets。
- [dwar Overview](/packages/dwar-overview) — rang を render して bundle する package。
- [utils Overview](/packages/utils-overview) — rang が import する browser-safe な contract。
</content>
