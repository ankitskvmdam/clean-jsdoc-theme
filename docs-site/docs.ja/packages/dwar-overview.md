---
title: 概要
group: Packages/dwar
order: 40
---

# `@clean-jsdoc-theme/dwar`

`@clean-jsdoc-theme/dwar` は theme の pipeline の後半を担います。これは
**純粋な renderer** です。`SiteManifest` を渡すと、すべての page を HTML へ
server-render し、interactive islands を bundle し、stylesheet と search index を
emit し、それらすべてを in-memory files として返します。これは
[setu](/packages/setu-overview) の render-side のカウンターパートであり、setu は
manifest を生成します。

> [!NOTE]
> **なぜこの名前なのか?** *dwar* (द्वार) はサンスクリット語/ヒンディー語で
> **扉 / 門 (door / gateway)** を意味します。`SiteManifest` がそこを通り抜けて
> 完成した HTML site になる、その門です。

唯一の entry point は
[`render(manifest, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
です。

```ts
function render(manifest: SiteManifest, opts: RenderOptions): Promise<RenderResult>;
```

> theme を使いたいだけなら、この package を直接 install することは決してありません
> — JSDoc と TypeDoc の bridges があなたの代わりにそれを call します。これは
> 内部的な building block です。実際に install するものについては
> [Packages](/#the-packages) セクションを、本物の call shape については
> [dwar Examples](/packages/dwar-examples) を参照してください。

## なぜ dwar が存在するのか

documentation build には本質的に異なる2つの仕事があります。**symbols を理解する
こと** と **pixels を render すること** です。setu が最初を、dwar が2番目を
行います。この分割によって、renderer は Preact、MDX、Shiki、esbuild、HTML shell
について知る唯一の場所になれます — その一方で、doclets がどう walk されたか、
sidebar がどう形作られたかについては無知のままでいられます。dwar は
**`SiteManifest` のみ** を consume します。doclet database を読み直すことは
決してありません。

`render`
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
が engine です) は、次の処理を順に行います。

- **stylesheet を作る** — `theme.tokens` から導出された theme variables に加え、
  事前 compile された Tailwind utility layer を、cache-busting のために
  `manifest.buildId` で stamp します
  ([`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts),
  `buildThemeVariableCss` + inlined `UTILITY_CSS`)。
- **islands を前もって bundle する** — **単一の split esbuild build** で。すべての
  island は entry point であり、`splitting: true` が共有 code (Preact、rang の
  registry) を別個の `chunk-<hash>.js` に hoist し、各 entry が relative ESM 経由で
  それを import します。emit されるすべての file は content-hashed です
  (`[name]-[hash].js`)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts))。
- **各 page を render する** — その MDX body を Preact component に compile し、
  rang の layout に composition し、HTML document に serialize します
  ([`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts),
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx),
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts))。
  Pages は限定された concurrency で render され (`min(8, cpus-1)` で capped された
  worker pool)、しかし元の page 順序に戻して組み立てられるため、output は
  deterministic です。
- **fuzzy-search index を emit する** — JSON file (page ごとに1 entry、加えて
  member/method の deep-links) で、`cmdk` command-palette island が runtime に
  fetch します。これは Pagefind の full-text bundle とは別物です。

### Source pages は MDX を飛ばす

frontmatter が `kind: 'source'` の page は whole-file viewer であり、prose では
ありません。dwar はその page では MDX compile を完全に飛ばし、代わりに
`code-viewer` island を mount します: SSR の `<pre>` が file text を運び、一方で
JSON props payload は意図的に code を省きます (hydration chunk がそれを DOM から
読み戻します)。Source pages は `hidden` なので、search index には何も寄与しません
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
`renderPage` の source branch)。

## 保証 (source で検証済み)

これらは dwar を定義する2つの properties であり、どちらも code で成立します。

### `render()` は純粋

dwar は disk に **書き込みません**。`render` は memory 上に `OutputFile`s の
array を allocate して返します。caller がそれらを persist します。render path
には `fs` write も `process.cwd()` も logging もありません。module docstring が
それを率直に述べています: *"`render()` is pure: it returns an in-memory
`RenderResult`."*

注意深く範囲を限定された2つの例外が規則を証明しますが、どちらも default path の
purity を壊しません。

- **`runPagefindAgainstDir`** は package 内で **唯一** の filesystem touch であり、
  *別個の post-write* function です — `render` から call されることは決して
  ありません。これは既に書き込まれた HTML の directory を対象に動作し、Pagefind
  bundle を `<dir>/pagefind/` の下に emit します
  ([`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts))。
- **`opts.islandCacheDir`** は opt-in です。bridge がそれを供給したとき (かつその
  ときだけ)、esbuild island bundle は on-disk cache から読み書きされます。それを
  省けば — default では — bundling は memory 内に留まります。worker pool の
  サイズを決めるために `os.cpus()` を読むことは、contract を *破らない* と明示的に
  注記されています (contract は fs/cwd/logging に関するものだからです)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts),
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts) の options)。

### `render()` は resilient

compile に失敗する単一の page (例: 解析不能な MDX) が build を **中断する
ことはありません**。各 page は `try/catch` の中で render されます: 失敗時には
その page はスキップされ、`result.errors` 内に `{ slug, message }` entry として
capture され、残りの site はそのまま render されます。error は *報告* され、
決して *throw* されません — bridges は build report の後に、スキップされた pages
を warning として log します
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
`task` closure;
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
がそれらを surface します)。

## `render()` は何を emit するか

すべては `result.files` の中に返ってきます (`OutputFile[]` で、各々が
`{ path, contents }`、destination root に対する forward-slash path を持ちます)。

- **page ごとの HTML** — `<slug>/index.html` (root/empty slug → `index.html`)、
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  からの完全な document shell。
- **co-located な companion `.md`** が各 content page に対して — page の MDX body
  を **そのまま (verbatim)** 書き出したもの (`<slug>/index.md`)。これにより LLMs や
  copy-page button が現在の page の Markdown source を fetch できます。
  Source-viewer pages は body を持たず、何も emit しません。
- **1つの stylesheet** — theme-variable + utility CSS、build-id で stamp 済み。
- **fuzzy-search index** — `_assets/search-index.<buildId>.json`、page entries に
  加えて member deep-links。
- **island bundles** — content-hashed な entry chunks に加え、共有 chunk、
  `_islands/` の下。
- **page ごとの JSON props payload** — 各 HTML document に
  `<script type="application/json" data-island-props>` として embed され、inline
  island loader が hydration 時に読み取ります
  ([`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts),
  `buildIslandsPropsPayload`)。

`files` と並んで、`RenderResult` は `search` (page ごとの entries、それを欲しがる
caller のため)、optional な `errors` array (page が失敗したときだけ存在)、
そして `stats` block (`pageCount`、`assetCount`、`cssBytes`、`jsBytes`、
`durationMs`) を運びます
([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))。

> 意図的に **`embedSearchIndex` flag はありません**。Full-text search は別個の
> `runPagefindAgainstDir` という post-write step です — renderer が Pagefind
> bundle を inline することは決してありません。

## Dependencies

dwar は、その downstream に位置する3つの sibling packages に加え、render
toolchain に依存します
([`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/package.json))。

- **`@clean-jsdoc-theme/utils`** — boundary types (`SiteManifest`、
  `RenderOptions`、`RenderResult`、`OutputFile`、…)。
  [utils Overview](/packages/utils-overview) を参照。
- **`@clean-jsdoc-theme/setu`** — manifest generator (smoke script が使用)。
  [setu Overview](/packages/setu-overview) を参照。
- **`@clean-jsdoc-theme/rang`** — dwar が bundle して composition する Preact
  components と island registry。[rang Overview](/packages/rang-overview) を参照。
- **`preact` / `preact-render-to-string`** は SSR のため、**`@mdx-js/mdx`** +
  **`@shikijs/rehype`** / **`shiki`** は MDX compile + highlighting のため、
  **`esbuild`** は island bundle のため、**`pagefind`** (optional) は post-write
  index のためです。

## source を読む

maintainer はあなたを code へ送りたいと考えています。ここから始めてください。

- **Package directory:**
  [packages/dwar](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar)
  ·
  [packages/dwar/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar/src)
- **entry point + purity/resilience logic:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
  (`render`、page ごとの `try/catch`、source-page branch)
- **option + result types:**
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  (`RenderOptions`、`RenderResult`、`OutputFile`、`RenderError`)
- **HTML shell:**
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  (`renderHtmlDocument`、`htmlPathFor`、`mdPathFor`、props payload)
- **layout seam:**
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  (`SsrLayout`、rang の slots + island markers を composition)
- **MDX compile:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts)
  (`compileMdxToComponent`、`collectUsedLangs`)
- **island bundle:**
  [`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  (split esbuild build) と
  [`islands-loader.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-loader.ts)
- **CSS pipeline:**
  [`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts)
- **(唯一の) filesystem touch:**
  [`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)
  (`runPagefindAgainstDir`)
- **runnable example:**
  [`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)

## 次へ

- [dwar Examples](/packages/dwar-examples) — runnable な smoke script と、2つの
  bridges から見た本物の call shape。
- [setu Overview](/packages/setu-overview) — dwar が consume する `SiteManifest`
  がどこから来るか。
- [rang Overview](/packages/rang-overview) — dwar が bundle する components と islands。
- [Configuration](/theme/configuration) — render を駆動する `theme` options。
</content>
