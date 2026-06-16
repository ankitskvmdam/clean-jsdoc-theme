---
title: "@category"
group: Components
order: 8
---

# `@category` — symbol を sidebar 内でグループ化する

`@category` は、ある symbol の生成された page を、その default の **kind section**
（Classes、Modules、Namespaces、…）の代わりに、明示的な sidebar group に置きます:

```ts
/**
 * @category Core
 */
export class Parser {}
```

`Parser` は **Classes** の下ではなく **Core** group の下に置かれるようになります。

> [!IMPORTANT]
> `@category` は unknown tag です — `jsdoc.json` に `tags.allowUnknownTags: true`
> を設定してください。さもないと JSDoc は theme が走る前にそれを取り除きます。
> [overview](/components/overview) を参照してください。（TypeDoc に flag は不要。）

## path の grammar

`parseCategory`（[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の中）は tag text を whitespace で分割し、その後:

- 素の tokens の **先頭の連なり** が **group path** であり、**単一の space で結合**
  されます。
- Parsing は `=` を含む最初の token で **options** に切り替わります。そこから先は
  すべて `key=value` です。
- group を **nest** するのは文字どおりの **`/`** です。Spaces は **nest しません**。

### Spaces は名前の一部のまま; `/` が nest する

ここが微妙な部分です。space は単に group 名の一部です — 親 ▸ 子 の関係を作るのは
`/` だけです。

```ts
/** @category Getting Started */
export class Intro {}
```

→ 文字どおり **Getting Started** という名前の 1 つのフラットな group（space は保た
れます）。

```ts
/** @category Core/Parsing */
export class Lexer {}
```

→ page を **Core ▸ Parsing** の下に nest します。

好きなだけ深く nest できます — `@category Core/Parsing/Internals` →
**Core ▸ Parsing ▸ Internals**。

### 最初の `@category` が勝つ

ある symbol が複数の `@category` を持つ場合、**最初の** ものが使われ、残りは無視され
ます。

## Inline `order=`

現在 `@category` の唯一の option は `order` です — within-group の **sort key** です:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}

/** @category Core/Parsing order=2 */
export class Token {}
```

`Lexer` は **Core ▸ Parsing** の中で `Token` より先に並びます。path は先頭の tokens
で、options は最初の `=` の後に続くので、`Getting Started order=1` は `order=1` を
持つ group **Getting Started** です。

> [!NOTE]
> **欠落または非数値** の `order` は undefined のまま残されます — その page は tag の
> 付いていないものと同様に、**最後** に alphabetically に並びます。

## 実例

```ts
/** @category Core */
export class A {}                 // → Core

/** @category Core/Schema order=1 */
export class Point {}             // → Core ▸ Schema, first

/** @category Data Pipeline */
export class Stage {}             // → "Data Pipeline" (one group; space kept)

/** @category Advanced/Internals order=10 */
export class Cache {}             // → Advanced ▸ Internals, order 10
```

## `@order` との組み合わせ

`@category` 上の inline な `order=` と、独立した [`@order`](/components/order) tag は、
どちらも同じ sort key に渡されます。ある symbol が **両方** を持つ場合、inline の
`@category … order=` が **勝ちます** —
[`@order` page の precedence rule](/components/order#precedence-category--order-wins)
を参照してください。

## sidebar をどう形作るか

`@category` は、theme の単一の sidebar-ordering engine における 1 つのレバーです —
すべての entry が `group` path と任意の `order` を運びます。prose の相当物は guide
page の **`group` frontmatter** です（同じ `/`-nesting 規則）。モデル全体 — nested
paths、leaf-vs-branch ordering、`clubSidebarItems`、`sectionOrder`、`docGroups`、
そして `menu` — は [Structure your sidebar](/guides/structure-your-sidebar) に
あります。

## こちらも参照

- [Components overview](/components/overview) — 完全な tag list +
  `allowUnknownTags`。
- [`@order`](/components/order) — category なしで symbol を順序付けする。
- [Structure your sidebar](/guides/structure-your-sidebar) — groups + order がどう
  組み合わさるか。
