---
title: "@order"
group: Components
order: 7
---

# `@order` — 任意の symbol をその group 内で並べる

`@order N` は、任意の symbol のための独立した **within-group sort key** です。inline
の [`@category … order=`](/components/category#inline-order) は `@category` を **持つ**
symbol にのみ適用されます; `@order` は、自身の素の **kind section** に置かれる
symbol にも機能します — category のない `@module`、`@class`、`@namespace` などです:

```ts
/**
 * @module config
 * @order 1
 */
```

`config` は、alphabetical order に fallback する代わりに、**Modules** section の
modules の中で最初に並ぶようになります。

> [!IMPORTANT]
> `@order` は unknown tag です — `jsdoc.json` に `tags.allowUnknownTags: true` を
> 設定してください。さもないと JSDoc がそれを取り除きます。
> [overview](/components/overview) を参照してください。（TypeDoc に flag は不要。）

> [!NOTE]
> この sort key は **JSDoc** sidebar に適用されます。`@order` は TypeDoc API
> sidebar には効果がありません — module 内では、members は kind によって、
> その後アルファベット順に並べられます。`@order` によってではありません。
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar)
> を参照してください。

## どちらを使うか

| Situation | Use |
| --- | --- |
| The symbol has a `@category` | `order=N` **inline** on that `@category` |
| The symbol sits in its kind section (no category) | the standalone `@order N` |
| The symbol has both | both are read — see precedence below |

**欠落または非数値** の値は undefined のまま残されるので、その symbol は **最後** に
（alphabetically）並びます。`@order` は
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の `readOrder` によって読み取られます。

## 優先順位: `@category … order=` が勝つ

ある symbol が `@category … order=` option と独立した `@order` の **両方** を持つ場
合、inline の `@category` order が **勝ちます** — それはより具体的で、同じ場所に書か
れた declaration だからです。解決された値は `renderContainerPage` で
`category?.order ?? readOrder(doclet)` として計算され、両方とも sidebar が読み取るのと
同じ `frontmatter.order` に渡されます。

```ts
/**
 * `order=1` (from @category) wins; the `@order 9` below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

したがって、`order=` をぶら下げる category が **ない** ときにこそ、独立した
`@order` に手を伸ばしてください。

## prose の相当物

guide page（prose）では、相当するのは **`order` frontmatter** field で、`@order` が
symbol を並べるのとまったく同じように、page をその `group` の中で並べます —
[Build a guides site](/guides/build-a-guides-site) を参照してください。

## こちらも参照

- [Components overview](/components/overview) — 完全な tag list +
  `allowUnknownTags`。
- [`@category`](/components/category) — grouping（と inline `order=`）。
- [Structure your sidebar](/guides/structure-your-sidebar) — 完全な ordering model。
