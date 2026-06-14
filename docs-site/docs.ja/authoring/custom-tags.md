---
title: Custom tags
group: Authoring
order: 5
---

# Custom tags

> [!NOTE]
> **どこで使えるか — source comments。** これらは JSDoc/TypeDoc の doc-comment
> tags で、あなたの source 内に書きます。Prose pages にはそれらに相当するものが
> あります: `group` / `order` frontmatter は `@category` / `@order` を反映し、
> ` ```iframe ` fence は `@iframe` を反映します（[Embeds](/authoring/embeds)
> を参照）。

Theme は、基本の JSDoc や TypeDoc が提供しないいくつかの doc-comment block tags
を読み取ります。これらは sidebar を形作り、source comments が live demos を埋め
込めるようにします:

- **`@category <path> [order=N]`** — ある symbol の page を明示的な sidebar
  group に置きます（さらに任意で順序付けします）。
- **`@order N`** — 任意の symbol のための独立した within-group sort key。
- **`@iframe <url> key=value`** — source comment から live demo を埋め込みます。

Category/order の parsing は
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
にあります（`parseCategory` / `readOrder`）。`@iframe` は
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
で処理されます。

> [!IMPORTANT]
> これら 3 つはすべて **unknown tags** です — 基本の JSDoc はこれらを定義しません。
> あなたの config は `jsdoc.json` で `tags.allowUnknownTags: true` を set する
> 必要があります（この site の
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> はそうしています）。これがないと、JSDoc は theme が動く前にこれらの tags を
> 取り除いてしまいます。

## `@category` — symbol を group 化する

`@category` は、ある symbol の生成された page を、その既定の kind section
（Classes、Modules、…）の代わりに、明示的な sidebar group に置きます:

```ts
/**
 * @category Core
 */
export class Parser {}
```

### Path tokens は space で結合される。nest するのは `/` のみ

ここは微妙な部分で、正しく理解する価値があります。`parseCategory` は tag text を
whitespace で分割し、その後:

- 素の tokens の **先頭の連なり** が **group path** であり、**単一の space で
  結合**されます。したがって `@category Getting Started` は文字どおり
  `Getting Started` という名前の 1 つのフラットな group です — space は名前の
  一部のまま残ります。
- Parsing は `=` を含む最初の token で **options** へ切り替わります。そこから先
  はすべて `key=value` です。
- group を **nest** するのは文字どおりの **`/`** です — `Core/Parsing` は page を
  **Core ▸ Parsing** の下に nest します。Spaces は nest しません。

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

これは `Lexer` を **Core ▸ Parsing** の下に置き、その subgroup の中で最初に
順序付けします。ある symbol で最初の `@category` が勝ちます。

### Inline `order=`

現在 `@category` の唯一の option は `order` です — within-group sort key です。
order が無い、または非数値の場合は undefined のまま残されます（page は最後に、
alphabetically に並びます。tag が付いていない page と同様です）。

## `@order` — 任意の symbol を順序付けする

inline の `order=` option は `@category` を **持つ** symbol にのみ適用されます。
自身の **kind section** に置かれる symbol — category のない素の `@module`、
`@class`、`@namespace` — を配置するには、独立した `@order` tag を使います:

```ts
/**
 * @module config
 * @order 1
 */
```

値が無い、または非数値の場合は undefined のまま残されます（最後に並びます）。
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の `readOrder` を参照してください。

### 優先順位: `@category … order=` が `@order` に勝つ

ある symbol が `@category … order=` option と独立した `@order` の **両方** を
持つ場合、inline の `@category` order が **勝ちます** — それはより具体的で、
同じ場所に書かれた declaration だからです。解決された order は
`renderContainerPage` で `category?.order ?? readOrder(doclet)` として計算されます。
両方とも sidebar が読み取るのと同じ `frontmatter.order` に渡されます。

```ts
/**
 * `order=1` (from @category) wins; the @order 9 below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

## `@iframe` — source から live demo を埋め込む

`@iframe` は、prose の ` ```iframe ` fence が使うのと同じ grammar を用いて、
doc comment から直接 sandboxed iframe を埋め込みます:

```js
/**
 * @iframe https://example.com/embed/demo title="Live demo" height=420
 */
export function render() {}
```

有効な `@iframe` はそれぞれ、symbol の `@example` section の後に `<Embed>` を
render します。無効な config（非 `https`、URL なし）は破棄されます。完全な
config grammar — 受け入れられる URL schemes、すべての option、そして
`themed` / `{theme}` の挙動 — は [Embeds & live demos](/authoring/embeds) に
documented されています。

## `@category` と `@order` が sidebar をどう形作るか

これらの tags は、theme の単一の sidebar ordering engine に渡される lever のうち
の 2 つです — すべての entry が `group` path と任意の `order` を運びます。
[Structure your sidebar](/guides/structure-your-sidebar) はモデル全体を扱います:
nested な `/`-paths、leaf-vs-branch ordering、`clubSidebarItems`、`sectionOrder`、
`docGroups`、そして `menu`。この page は tag syntax だけです。あちらの page は
ピースがどう組み合わさるかです。

## こちらも参照

- [Structure your sidebar](/guides/structure-your-sidebar) — 完全な sidebar
  ordering model。
- [Embeds & live demos](/authoring/embeds) — `@iframe` config grammar の全体。
- [Configuration](/theme/configuration) — `sectionOrder`、`docGroups`、その仲間。
- [Build a guides site](/guides/build-a-guides-site) — guide-page frontmatter
  （`group` / `order`）、これらの tags の prose 版。
