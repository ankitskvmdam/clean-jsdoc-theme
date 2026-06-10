# typedoc `@order` example

A small TypeScript library that demonstrates the **`@order`** sidebar-positioning
tag rendering through the `@clean-jsdoc-theme/typedoc` plugin (TypeDoc →
`setu` → `dwar`).

```sh
pnpm --filter example-typedoc-example run docs
pnpm dlx serve dist
```

`@order` is a standalone block tag (declared in `typedoc.json`'s `blockTags` so
TypeDoc keeps it; the plugin forwards it to `setu`, which reads it as the page's
`frontmatter.order`). Lower number sorts earlier; no `@order` sorts last.

## What the sidebar shows

### `Core` — `@order` orders the parent subgroups *and* the leaves

`src/core.ts` puts four classes into two `@category` subgroups under `Core`. A
subgroup sorts by the **minimum `@order`** of its members, so `Schema` (orders
1–2) floats above `Parsing` (orders 3–4) — even though "Parsing" is earlier
alphabetically. Inside each subgroup the leaves sort by their own `@order`:

```
Core
  ▸ Schema           (min order 1 → before Parsing)
      Schema         (@order 1)
      Validator      (@order 2)
  ▸ Parsing          (min order 3)
      Parser         (@order 3)
      Tokenizer      (@order 4)
```

This is the **"order the parent of multiple children"** case: `@order` on a
member moves the whole subgroup.

### `Classes` — `@order` orders leaves within a kind section

`src/util.ts` has three un-categorized classes, so they land in the `Classes`
kind section and sort by `@order`:

```
Classes
  Logger     (@order 1)
  Metrics    (@order 2)
  Cache      (no @order → last, alphabetical)
```

This is the **"order children within a section"** case, with no category
grouping involved.

## See also

- `examples/basic` annotates its **clubbed** `queue` module group with `@order`
  to show the same two cases through the clubbing path (`clubSidebarItems`)
  rather than `@category` nesting.
- `examples/typedoc-basic` is the minimal kinds smoke fixture for the plugin.
