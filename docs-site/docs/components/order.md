---
title: "@order"
group: Components
order: 7
---

# `@order` — sort any symbol within its group

`@order N` is a standalone **within-group sort key** for any symbol. The inline
[`@category … order=`](/components/category#inline-order) only applies
to a symbol that **has** a `@category`; `@order` works on a symbol that lives in
its plain **kind section** too — a `@module`, `@class`, `@namespace`, etc. with
no category:

```ts
/**
 * @module config
 * @order 1
 */
```

`config` now sorts first among the modules in the **Modules** section, instead of
falling back to alphabetical order.

> [!IMPORTANT]
> `@order` is an unknown tag — set `tags.allowUnknownTags: true` in your
> `jsdoc.json` or JSDoc strips it. See the [overview](/components/overview).
> (TypeDoc needs no flag.)

## When to use which

| Situation | Use |
| --- | --- |
| The symbol has a `@category` | `order=N` **inline** on that `@category` |
| The symbol sits in its kind section (no category) | the standalone `@order N` |
| The symbol has both | both are read — see precedence below |

A **missing or non-numeric** value is left undefined, so the symbol sorts
**last** (alphabetically). `@order` is read by `readOrder` in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts).

## Precedence: `@category … order=` wins

When a symbol carries **both** a `@category … order=` option **and** a standalone
`@order`, the inline `@category` order **wins** — it's the more specific,
co-located declaration. The resolved value is computed as
`category?.order ?? readOrder(doclet)` in `renderContainerPage`, and both feed the
same `frontmatter.order` the sidebar reads.

```ts
/**
 * `order=1` (from @category) wins; the `@order 9` below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

So reach for the standalone `@order` precisely when there's **no** category to
hang an `order=` off of.

## The prose counterpart

On a guide page (prose), the equivalent is the **`order` frontmatter** field,
which sorts the page within its `group` exactly like `@order` sorts a symbol —
see [Build a guides site](/guides/build-a-guides-site).

## See also

- [Components overview](/components/overview) — the full tag list +
  `allowUnknownTags`.
- [`@category`](/components/category) — grouping (and inline `order=`).
- [Structure your sidebar](/guides/structure-your-sidebar) — the full ordering model.
