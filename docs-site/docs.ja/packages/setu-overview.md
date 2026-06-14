---
title: 概要
group: Packages/setu
order: 20
---

# `@clean-jsdoc-theme/setu`

`@clean-jsdoc-theme/setu` は theme の pipeline の前半を担います。JSDoc/TypeDoc の
**doclet collection** を、構造化された **`SiteManifest`** — pages、nav tree、
そしてそれらを結びつける link resolution — に変換します。これは
[dwar](/packages/dwar-overview) の build-side のカウンターパートであり、dwar は
manifest を HTML へ render します。

> [!NOTE]
> **なぜこの名前なのか?** *setu* (सेतु) はサンスクリット語で **橋 (bridge)** を
> 意味します。この package があなたの生の doclets を renderer が consume する
> 構造化された `SiteManifest` へと橋渡しするので、ふさわしい名前です。

唯一の entry point は
[`generateSite(collection, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
です。

```ts
function generateSite(collection: unknown, opts?: GenerateSiteOptions): SiteManifest;
```

> theme を使いたいだけなら、この package を直接 install することは決してありません
> — JSDoc と TypeDoc の bridges があなたの代わりにそれを call します。これは
> 内部的な building block です。実際に install するものについては
> [Packages](/#the-packages) セクションを、call shape については
> [setu Examples](/packages/setu-examples) を参照してください。

## なぜ setu が存在するのか

documentation build には本質的に異なる2つの仕事があります。**symbols を理解する
こと** (doclets を walk し、members を bucket し、cross-references を resolve し、
sidebar を形作る) と、**pixels を render すること** (MDX compile、islands、HTML、
search index) です。setu は最初の仕事であり、renderer を一切視野に入れずに
推論しテストできるよう分離されています。

salty doclet collection を与えると、`generateSite`
([`generate-site.ts` が engine です](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))
は次を生成します。

- **container symbol ごとに1つの page。** container kinds —
  `module`、`namespace`、`class`、`interface`、`mixin`、`typedef` — はそれぞれ
  独立した page を得て、その固定された順序で列挙されます (詳しくは
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  の `CONTAINER_KINDS` を参照)。Typedefs は classes とまったく同じ
  `getContainerView` / `renderContainerPage` の path を通ります。
- **集約された1つの "Globals" page。** 自分の page を持たないすべての
  global-scope symbol (functions、members、constants、enums、events) は、1つの
  synthetic container 上の member section として render されます
  ([`buildGlobalsView`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))。
- **Prose / guide pages** は3つの free-form なソースから: project README
  (home page)、docs directory、そして JSDoc tutorials
  ([`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts))。
- **Read-only な source-viewer pages** と、各 member から戻る
  `Source: file:line` links。bridge が project の source files を供給したとき
  ([`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts))。
- **nav tree** — sidebar — は kind ごと、または authored な `@category` ごとに
  sections へグループ化され、`sectionOrder` / `@order` によって順序付けられます
  ([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))。
- **Resolved cross-references** は、すべての `{@link}` / `@see` / `@tutorial`
  に対して
  ([`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts))。

## contract の boundaries

setu は意図的に囲い込まれています。これらは source で検証できる boundaries であり、
build 側を render 側から独立に保つものです。

- **Markdown/MDX のみを emit し、HTML は出しません。** すべての page body は
  [`toMdx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  を通じて serialize され、mdast tree を MDX-safe な Markdown へ変換します。
  さらに custom link serializer も備えており、これは *常に* resource 形式
  `[label](url)` を emit し、autolink 形式 `<url>` は決して emit しません。
  裸の `<url>` は JSX として parse され、dwar の MDX compile を中断させてしまう
  からです。setu は最終的な HTML を決して生成しません。それは dwar の仕事です。
- **I/O を一切行いません。** setu は filesystem に決して触れません。README は
  string として届き、docs と source files は bridge によって事前に読み込まれて
  届き、tutorials は normalized tree として届きます。`generate-site.ts` と
  `source-view.ts` はどちらも、module が純粋であることを comments で述べています
  — 与えられた inputs を変換するだけです (`fs` も `cwd` もありません)。
- **`utils` のみに依存します。**
  [`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/package.json)
  にある唯一の workspace dependency は `@clean-jsdoc-theme/utils` です (共有された
  boundary contract — `SiteManifest`、`Page`、`NavNode`、slug rules)。残りは
  mdast/hast/markdown processing libraries です。setu は **dwar** や **rang** を
  決して import しません。dependency の矢印は一方向だけを指します。

## 二段階 (two-pass) の link build

Pages は互いに link し合い、ある page はそれより *後に* 列挙された symbol を
参照することがあります。そのため `generateSite` は複数の passes で build します
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts),
[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts))。

1. **specs を集める (1回の dedup pass)。** `CONTAINER_KINDS` を順に反復し、各
   container の view + slug を作り、slug が衝突する後続の container を破棄する
   のではなく *merge* します — そうすればどちらの doclet の members や relations
   も失われません。dedup はここ1か所だけで起こるため、registry と rendered pages
   が乖離することはありません。
2. **link registry を満たし、それから resolver を作る。** registry は
   *正確に生き残った spec set* から満たされ、いかなる page body が render される
   前にも完全に満たされます — これにより forward references が resolve されます。
   resolver (`makeLinkResolver`) は exact longnames、双方向の `module:`-prefix
   fallback、そして裸の名前が曖昧なときに推測を拒む unique short-name fallback を
   扱います。
3. **Render。** 生き残った各 view は一度だけ render され (決して再構築されません)、
   source-link resolver、registry-backed link resolver、`@tutorial` resolver を
   mdast へ通します。

manifest 上の `buildId` は、pages の slugs + bodies に対する
`{timestamp}-{hash}` の digest です — content-stable なので、dwar は正しく
cache-bust できます。

## 何が返ってくるのか

`generateSite` は
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
を返します。

```ts
interface SiteManifest {
  pages: Page[];
  nav: NavNode[];
  pkg?: { name?; version?; description?; repository?; homepage? };
  buildId: string;
}
```

manifest は self-contained です。dwar が doclet database を読み直すことは
決してありません。この object をそのまま
[`dwar.render()`](/packages/dwar-overview) に渡します。

## source を読む

maintainer はあなたを code へ送りたいと考えています。ここから始めてください。

- **Package directory:**
  [packages/setu](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu)
  ·
  [packages/setu/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src)
- **entry point + options:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  (`generateSite`、`GenerateSiteOptions`)
- **build engine:**
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  (two-pass build、`assembleNav`、`enumerateLongnamesByKind`、`buildGlobalsView`)
- **Container views:**
  [`class-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/class-view.ts)
  (`getContainerView`、kind-parametric)
- **Prose pages:**
  [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  (README → home、docs → guides、`tutorialsToDocInputs`)
- **Source viewer:**
  [`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)
- **Cross-references:**
  [`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)
- **MDX serialization:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  と
  [`mdast/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src/mdast)
  directory

## 次へ

- [setu Examples](/packages/setu-examples) — setu を consume する2つの bridges から
  見た本物の call shape。
- [dwar Overview](/packages/dwar-overview) — `SiteManifest` を render する package。
- [utils Overview](/packages/utils-overview) — setu が import する共有 boundary
  contract。
</content>
