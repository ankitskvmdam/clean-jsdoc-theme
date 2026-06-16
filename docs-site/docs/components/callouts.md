---
title: Callouts
group: Components
order: 2
---

# Callouts

> [!NOTE]
> **Where this works — prose & API docs.** Author callouts in any prose (README,
> tutorials, the docs directory), and the theme also emits one automatically from
> a `@deprecated` doc-comment tag in your source.

Callouts are typed, colored notice boxes — the kind you use for a tip, a
warning, or an important aside. You write them as **GitHub-style alert
blockquotes**: an ordinary blockquote whose first line is a `[!TYPE]` marker.

This works in any prose the theme renders — your README, tutorials, and the docs
directory — because the promotion happens during the shared HTML normalization
pass in
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts).

## Syntax

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming.
```

renders as:

> [!NOTE]
> Useful information that users should know, even when skimming.

The marker must be the very first thing inside the blockquote (`blockquoteToCallout`
reads it off the first text node and matches `^\s*\[!(\w+)\]\s*`). The marker is
stripped from the body; everything after it becomes the callout content. An
absent or unrecognized marker leaves the blockquote as a plain quote.

## The four variants and their markers

There are exactly **four** callout variants — `info`, `tip`, `warning`, and
`error`. Several GitHub-style keywords fold onto each. This is the complete
`CALLOUT_ALERTS` map from
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts);
the marker is **case-insensitive** (it is lower-cased before lookup):

| Marker you write | Variant |
| ---------------- | ------- |
| `[!INFO]`        | info    |
| `[!NOTE]`        | info    |
| `[!IMPORTANT]`   | info    |
| `[!TIP]`         | tip     |
| `[!SUCCESS]`     | tip     |
| `[!WARNING]`     | warning |
| `[!CAUTION]`     | warning |
| `[!ERROR]`       | error   |
| `[!DANGER]`      | error   |

So `[!NOTE]` and `[!IMPORTANT]` both render as the blue **info** box, `[!TIP]`
and `[!SUCCESS]` as the green **tip** box, `[!WARNING]` and `[!CAUTION]` as
**warning**, and `[!ERROR]` and `[!DANGER]` as **error**. There is no separate
"caution" or "danger" color — they alias onto warning and error.

## Every variant, rendered

### Info — `[!INFO]`, `[!NOTE]`, `[!IMPORTANT]`

```markdown
> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.
```

> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.

### Tip — `[!TIP]`, `[!SUCCESS]`

```markdown
> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.
```

> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.

### Warning — `[!WARNING]`, `[!CAUTION]`

```markdown
> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.
```

> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.

### Error — `[!ERROR]`, `[!DANGER]`

```markdown
> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.
```

> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.

## Rich content and nesting

The body is normal Markdown — paragraphs, lists, code, links — and callouts
promote at **any depth**, including inside list items, mirroring how GitHub
renders alerts nested in lists (`promoteCallouts` recurses through children):

```markdown
> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```
```

> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```

## Callouts from doc-comment tags

Callouts are not only a prose feature. When you document a symbol with
**`@deprecated`**, the theme emits a callout automatically — no marker needed.
See `deprecationBlock` in
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts):

```js
/**
 * @deprecated Use {@link newApi} instead.
 */
```

A bare `@deprecated` with no reason falls back to a kind-aware default sentence
("This method is deprecated and should not be used."), so the box is never
blank.

You can also write the **alert markers themselves** straight into a description
— they're promoted exactly as in prose:

````js
/**
 * Cache statistics.
 *
 * > [!INFO]
 * > Counts reset when you call `clear()`.
 *
 * > [!WARNING]
 * > `get()` mutates recency — avoid it in hot loops.
 */
````

> [!TIP]
> See an `[!INFO]` callout authored in a real `@module` comment on the
> **[sample-api module page](/api-docs/module/sample-api)**
> of the live demo — source in
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js).

## Under the hood

A callout is emitted as a capitalized `<Callout type="…">` MDX JSX node (the
`callout` builder in
[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)).
rang registers `Callout` → `MdxBlockquote` in
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx),
so a callout and a plain markdown blockquote share one component — it just
branches to typed styling when `type` is set. The capitalized name is what lets
the variant survive serialization to dwar (a plain `>` quote can't carry it).

## See also

- [Steps](/components/steps) and [Tabs](/components/tabs) — the other prose
  authoring containers.
- [Embeds & live demos](/guides/embeds) for `<Embed>` / `@iframe`.
- [Custom tags](/components/overview) for `@category`, `@order`, and `@iframe`.
