---
title: 例
group: Packages/setu
order: 21
---

# setu Examples

setu は **internal** です。通常の docs build で `generateSite` を call することは
ありません — JSDoc と TypeDoc の bridges があなたの代わりに call します。これに直接
手を伸ばすのは、*custom bridge*（salty doclet collection を produce する新しい
front-end）を build しているときだけです。そのため、ここでの正直な例は theme と共に
ship される 2 つの本物の bridges です。

単に theme を configure したいだけなら、代わりに
[Configuration](/theme/configuration) と [guides](/guides/build-an-api-reference)
を参照してください。

## The call shape

両方の bridges は salty doclet collection を build し、options object を assemble し、
`generateSite` を call します。以下のすべての field は
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
の `GenerateSiteOptions` に存在します — 何も捏造されていません。

これは TypeDoc bridge です。完全に ESM であり、setu を直接 import します（出典:
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)）:

```ts
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';

// reflections → flat doclets → a salty collection (the shape setu consumes).
const doclets = reflectionsToDoclets(project, logger);
const collection = salty.taffy(doclets);

const manifest = generateSite(collection, {
  ...(pkg ? { pkg } : {}),                         // package.json fields
  ...(readme ? { readme } : {}),                   // README HTML → home page
  ...(sources.length > 0 ? { sources } : {}),      // SourceFileInput[] → viewer pages
  ...(sectionOrder ? { sectionOrder } : {}),        // sidebar section order
  ...(menu ? { menu } : {}),                        // full sidebar menu
  ...(clubSidebarItems ? { clubSidebarItems } : {}),// prefix-group sidebar entries
});
```

JSDoc bridge は同じことを行い、加えて JSDoc run からのみ意味を持つ options を渡します
— tutorials、docs directory、doc-group ordering、そして source-link target（出典:
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)）:

```ts
const manifest = generateSite(data, {
  ...(pkg ? { pkg } : {}),
  ...(readme ? { readme } : {}),
  ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
  ...(sources.length > 0 ? { sources } : {}),
  ...(sources.length > 0 && sourceLinkToComment ? { sourceLinkToComment } : {}),
  ...(docs.length > 0 ? { docs } : {}),
  ...(docGroups ? { docGroups } : {}),
  ...(defaultDocGroup ? { defaultDocGroup } : {}),
  ...(sectionOrder ? { sectionOrder } : {}),
  ...(menu ? { menu } : {}),
  ...(clubSidebarItems ? { clubSidebarItems } : {}),
});
```

pattern に注目してください: すべての option は conditionally に spread されるので、
存在しない feature は単に pass されないだけです。**唯一必須の argument は collection
です** — `generateSite` への両方の argument は、それ以外は bridge が見つけたものに
よって driven されます。

### 完全な option surface

`GenerateSiteOptions` のすべての field
（[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)）:

| Option | 何をするか |
| --- | --- |
| `pkg` | package.json fields を manifest に embed（header/footer/OG tags）。 |
| `readme` | Project README を **HTML として** → site home page（slug `''`）。 |
| `tutorials` | `TutorialInput[]` tree → "Tutorials" の下の guide pages。 |
| `docs` | `DocInput[]` list（bridge が事前に読み込み済み）→ prose/guide pages。root の `index` は home page になる。 |
| `docGroups` | Top-level の doc-group 表示順。 |
| `defaultDocGroup` | group のない doc page の group label。 |
| `sources` | `SourceFileInput[]` → read-only な source-viewer pages + `Source:` links。 |
| `sourceLinkToComment` | `true` → `Source:` links は declaration ではなく doc-comment line を指す（default `false`）。 |
| `sectionOrder` | `@category` names、doc groups、kind labels を順序付ける 1 つの統一 list。 |
| `menu` | 完全な sidebar menu（`sectionOrder` より優先される）。 |
| `clubSidebarItems` | 関連 entries を one-level の prefix subtrees に club する。 |

## 何が返ってくるか、そしてどこへ行くか

`generateSite` は
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
を返します — `pages`、`nav`、optional な `pkg`、そして content-stable な `buildId`:

```ts
const manifest = generateSite(collection, opts);
// manifest.pages   — Page[]  (one per symbol + globals + prose + source pages)
// manifest.nav     — NavNode[] (the sidebar tree)
// manifest.buildId — string  (timestamp + content hash, for cache busting)
```

> manifest は **search index field を一切** 持ちません。setu の per-page bodies こそが
> 後で search を feed するものです; manifest 自体は単なる `{ pages, nav, pkg?, buildId }`
> です。

次の step は常に同じです: manifest をそのまま
[`dwar.render()`](/packages/dwar-overview) に渡し、それが HTML に変換します。両方の
bridges はまさにこれを行います:

```ts
import { render } from '@clean-jsdoc-theme/dwar';

const result = await render(manifest, { theme, destination });
await writeOutputFiles(destination, result.files);
```

setu が model を produce し、dwar がそれを render します。両者は決して互いを import
しません — [utils](/packages/utils-overview) で定義された `SiteManifest` type の上で
のみ出会います。

## authored features は setu の挙動にどう map するか

source comments や docs files に書くものが、ここで manifest structure になります。
知っておく価値のあるいくつかの connections:

- **`@category` と `@order`。** API symbol の `@category Core/Parsing order=1` tag は
  その sidebar group になり（`/`-path はそれを nest します: `Core` ▸ `Parsing`）、
  group 内の sort key になります。単独の `@order N` は *任意の* symbol を — tag のない
  `@class` でさえ — その kind section 内で position します。parse は
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  で行われます。参照: [sidebar を構造化する](/guides/structure-your-sidebar)
  と [Custom tags](/authoring/custom-tags)。
- **README → home。** あなたの README（JSDoc/TypeDoc によって HTML に rendered）は
  slug `''` の home page になります。
  [`buildReadmePage`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  を経由します。docs directory の root の `index.md` がそれを override します。
- **Docs folder → guide pages。** docs directory の下の各 Markdown/HTML file は、
  その clean な（unprefixed）slug の prose page になり、frontmatter の `group` または
  その directory path によって grouped されます。
  [`buildDocPages`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  を経由します。Frontmatter の `title` / `group` / `order` / `hidden` が尊重されます。
  参照: [guides site を build する](/guides/build-a-guides-site)。
- **`{@link}` / `@see` / `@tutorial`。** pass 2 で build された link registry に対して
  resolve されます — 実際に page または member heading を持つ targets のみが resolve
  され、残りは broken anchor ではなく inert text に fall back します
  （[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)）。

## Read the source

これらは canonical で動作する usages です — 上記のどの snippet を信じるよりも、これらを
読んでください:

- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — `salty.taffy` で collection を build し、`generateSite` を call し、manifest を
  `render` に渡す。
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — JSDoc が invoke する `publish(data, opts, tutorials)` entry; sources、docs、
  tutorials を collect し、それから `generateSite` を call する。
- **The options type:**
  [`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)

## 次へ

- [setu 概要](/packages/setu-overview) — setu がなぜ存在するか、その contract
  boundaries。
- [dwar 概要](/packages/dwar-overview) — `SiteManifest` を consume するもの。
- [API reference を build する](/guides/build-an-api-reference) — これらの bridges が
  power する end-to-end の path。
