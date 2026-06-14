---
title: 概要
group: Packages/utils
order: 10
---

# `@clean-jsdoc-theme/utils`

`@clean-jsdoc-theme/utils` は、pipeline 内の他のすべての package が import する
共有 contract です。これは **setu と dwar の間の type boundary**、nav links と
heading anchors が常に一致するように両者が使う **slug rules**、そして
entry-point bridges が実行する純粋な **opts-validation + build-report** ロジック
を定義します。

rendering も I/O も一切含まれません。残りのシステムが構築される土台となる
interfaces、Zod schemas、そして少数の小さな純粋関数だけです。

> theme を使いたいだけなら、この package を install することは決してありません。
> これは内部的な building block です。実際に install する部分については
> [Packages](/#the-packages) セクションを、オプションについては
> [Configuration](/theme/configuration) を参照してください。

## なぜ独立した package なのか

pipeline 全体は意図的に一方向です。setu は doclets を `SiteManifest` に変換し、
dwar がその manifest を render します。そして両者の間に隠れた coupling が決して
育ってはなりません。boundary types を独立した package に切り出すことで、
project は次の2つを手に入れます。

- **boundary に対する単一の真実の源。** setu は `SiteManifest` を emit し、dwar は
  *同じ* `SiteManifest` type を consume します。そしてどちらも他方を import
  しません。この形は一度だけここで定義されるため、build 側と render 側が
  乖離することはありません。これは boundary barrel である
  [`site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  で確認できます。その doc comment 自体がこれを「the boundary contract between
  setu (build) and dwar (render)」と呼んでいます。
- **Browser-safe なので rang も import できる。** Preact component library
  (rang) は browser 上で動くため、共有する contract は node-free でなければ
  なりません。ここにある slug rules、base-path helpers、diagnostics model、
  build-report formatter は web-platform globals (`URL`、`TextEncoder`、`fetch`、
  `AbortController`) のみを使い、`fs`、`Buffer`、`node:*` は決して使いません。
  唯一の networked dependency (Google Fonts の存在確認) と唯一の node-only
  dependency (gzip sizing) は、import するのではなく caller によって
  **inject** されます。これこそが package を browser で importable に保つ仕組み
  です。

トップの barrel である
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
がすべてを re-export し、`package.json` は単一の entry point を公開します。
したがってすべての consumer は `@clean-jsdoc-theme/utils` から import します
(subpath exports はありません)。

## 中身は何か

package は2つの surface に分かれます。`site/` contracts と `config/` logic、
さらに JSDoc doclet schema です。

### `site/` — setu ↔ dwar の contract

boundary objects と、両者が共有しなければならない rules です。検証済みの
exports には次が含まれます。

- **`SiteManifest`、`Page`、`NavNode`、`SearchEntry`** — setu が dwar に渡すもの:
  pages、nav tree、search index、そして cache busting 用の `buildId` です。
  manifest が self-contained であるのは意図的です。dwar が doclet database を
  読み直すことは決してありません。
  ([`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts),
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`Frontmatter`、`PageKind`、`Heading`** — page ごとの metadata、layout を
  駆動する page kind (`class`、`module`、`guide`、`source`、…)、そして TOC island
  が render する事前抽出済みの headings です。
  ([`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`RenderOptions`、`RenderResult`、`OutputFile`、`RenderError`** — `dwar.render`
  の入力と出力です。`render()` は純粋で、files を memory 上で返します。doc
  comment は、意図的に `embedSearchIndex` flag を設けていないと述べています。
  ([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))
- **`ThemeConfig`、`ThemeTokens`、`ThemeColors`、`ComponentOverrides`** — theme
  contract: color tokens、fonts、Shiki themes、component slot overrides、
  base path、copy-page と prev/next の config、custom CSS/JS です。
  ([`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts))
- **`SiteName`、`SiteLogo`** と helpers の `siteNameText()` および
  `resolveSiteLogo()` — plain-text または logo-set による site identity です。
  ([`site-name.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/site-name.ts))
- **`IslandName`、`IslandPropsMap`** — interactive islands の registry
  (`sidebar`、`toc`、`cmdk`、`copy-page`、…) と、それぞれに対する type-safe な
  prop bag で、server render と hydration の間で共有されます。
  ([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts))
- **`slugifyHeading()`、`slugifyPath()`、`slugifySourcePath()`** — GitHub-style
  の slug rules です。setu (sidebar / TOC generation) と dwar (rendered anchor
  IDs) の両者がここから import するため、anchors と links は常に一致します。
  この file はこれを「Risk R4」に対処するものだと明記しています。
  ([`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts))
- **`normalizeBasePath()`、`withBase()`** — site を sub-directory から serve する
  ための、純粋で browser-safe かつ fail-safe な helpers です。
  ([`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts))

### `config/` — 純粋な opts validation + build report

build の前後に entry-point bridges が実行する logic です。

- **`validateThemeOpts()`** — orchestrator です。raw な opts object を受け取り、
  `siteName` と `fonts` の validators、さらに unknown-key policy を単一の
  `DiagnosticBag` で実行し、normalized な値を返します。決して throw しません。
  strict-mode の強制は `diagnostics.hasErrors()` を介した caller の仕事です。
  ([`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts))
- **`DiagnosticBag`、`Diagnostic`、`formatDiagnostics()`** — reporting の背骨:
  純粋で node-free な、構造化され level-tagged (`error` / `warning` / `info`)
  された finding model です。
  ([`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts))
- **`createGoogleFontResolver()`、`FontResolver`、`FontExistence`、
  `FetchLike`** — utils を browser-safe に保つ *injection* パターンです。
  唯一の networked チェック (この Google Font は存在するか?) は inject された
  `fetch` を中心に組み立てられ、**fail-open** です。曖昧なものはすべて
  `'unknown'` に resolve されるため、offline build が壊れることは決してありません。
  ([`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts))
- **`formatBuildReport()`** — Next.js 風の build summary です。byte sizes は
  `TextEncoder` から得られます (`Buffer` は決して使いません)。gzip sizing は
  *inject* された `gzipSizer` で、これもまた utils を node-free に保つためです。
  ([`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts))
- **Zod schemas** — `THEME_OPT_KEYS`、`SiteNameSchema`、`FontsSchema`、
  `MenuSchema`、`CopyPageConfigSchema` などです。認識される theme-option surface
  を Zod として表現したもので、failures が構造化された `path` + `message` を
  伴うようになっています。
  ([`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts))

### doclet schema

`doclet-schema.ts` (`TDoclet` など) と `salty.ts`
(`TJSDocSaltyCollection`) は、setu が読む JSDoc 側の types を運びます。これらも
トップの barrel から re-export されるため、setu の doclet processing は同じ
package から import します。

## injection パターンの仕組み

これが config package を browser-safe に保つ詳細です。utils は `fetch` や `zlib`
を決して import しません。caller がそれらを渡します。

- `validateThemeOpts({ … fontResolver })` は、bridge が
  `createGoogleFontResolver()` で構築した resolver を受け取ります。これがなければ、
  font existence チェックは穏やかにスキップされ、build は先へ進みます。
- `formatBuildReport({ … gzipSizer })` は gzip function を受け取ります。gzip
  column は sizer が供給されたときだけ現れます。bridge は
  `(b) => zlib.gzipSync(b).length` を渡します。

`google-fonts.ts` と `report.ts` の両方が、これを module doc comments で
述べています。networked / node-only dependency は「is never imported, only the
optional [resolver/sizer] injected by the caller.」です。

## source を読む

maintainer はあなたを code へ送りたいと考えています。ここから始めてください。

- **Package directory:**
  [packages/utils](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils)
  ·
  [packages/utils/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils/src)
- **Barrels:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
  ·
  [`src/site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  (boundary barrel) ·
  [`src/config/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/index.ts)
- **contracts:**
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
- **config logic:**
  [`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)
  ·
  [`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts)
  ·
  [`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)
  ·
  [`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts)
  ·
  [`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts)

## 次へ

- [utils Examples](/packages/utils-examples) — これらの types を使った具体的な snippets。
- [setu Overview](/packages/setu-overview) — `SiteManifest` を *生成する* package。
- [dwar Overview](/packages/dwar-overview) — それを *消費する* package。
</content>
</invoke>
