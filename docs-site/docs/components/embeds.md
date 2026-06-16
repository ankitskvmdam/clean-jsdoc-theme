---
title: Embeds
group: Components
order: 3
---

# Embeds

> [!NOTE]
> **Where this works — prose & API docs.** Author an embed in prose with the
> ` ```iframe ` fence, or from a source comment with the `@iframe` block tag.
> Both share one config grammar.

An **embed** is a sandboxed `<iframe>` — a CodePen, a StackBlitz, a live demo,
a video. The theme gives you two ways to author one, and they share **one config
grammar**:

- in **prose** (README, tutorials, the docs directory) — a ` ```iframe ` fenced
  code block;
- in **source comments** — the `@iframe <url> key=value` doc-comment block tag.

Both parse through `parseEmbedConfig` in
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
and become the same `<Embed>` island
([`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)).

## The config grammar

The config is a single line (the fence body may span lines, but tokens are
whitespace-delimited):

```
<url> key=value key="value with spaces" flag
```

- The **first** whitespace-delimited token is the **URL** (required).
- Every token after it is a `key=value` pair.
- Values may be wrapped in single or double quotes, and a quoted value may
  contain spaces.
- A bare token with no `=` is treated as a `true` flag, but **only** for boolean
  keys; any other bare token warns and is ignored.

### URL schemes

For security, `parseEmbedConfig` accepts **only** `https://` URLs or
**protocol-relative** `//` URLs. Anything else — `http://`, a relative path, an
empty string, or a missing URL — makes the parser return `null`, and the embed
is **dropped** (the parser logs a warning). See the `src.startsWith('https://')
|| src.startsWith('//')` check in
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts).

### Options

| Key           | Type    | Notes |
| ------------- | ------- | ----- |
| `title`       | string  | iframe title (accessibility) + click-to-load poster label. |
| `width`       | string  | CSS width. Default `100%`. |
| `height`      | number  | Pixels. Default `400` when no `aspectRatio`. A non-numeric value is dropped. |
| `aspectRatio` | string  | e.g. `16/9`. Preferred over `height` when set. |
| `allow`       | string  | iframe `allow=` list, e.g. `"fullscreen; clipboard-write"`. |
| `sandbox`     | string  | Override the default sandbox token list. |
| `clickToLoad` | boolean | Render a click-to-load poster instead of a live iframe. |
| `themed`      | boolean | Sync to the active theme. **On by default** (see below). |

Unknown keys warn and are ignored; the embed still renders. The default sandbox
is `allow-scripts allow-same-origin allow-popups allow-forms`.

### Theme syncing — `themed` and the `{theme}` token

`themed` is **on by default**; pass `themed=false` to opt out. When on, the embed
re-points itself whenever the page theme flips, picking one mechanism in priority
order (`resolveSrc` in
[`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)):

1. a literal **`{theme}` token** in the URL is replaced with `light` / `dark`;
2. an author-declared `theme-id` query param is left untouched (it wins);
3. otherwise `?theme-id=<theme>` is appended automatically.

So `https://example.com/demo?ui={theme}` becomes `…?ui=dark` in dark mode. Only a
literal `themed=false` (case-insensitive) disables this — anything else, including
omitting it, keeps it on.

## Authoring form 1 — the ` ```iframe ` prose fence

In any README / tutorial / docs page, write a fenced block with the info string
`iframe`. The body is the config:

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

The fence is lowered to `<Embed>` by `resolveEmbedFences` in
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).
A valid config becomes the embed; an invalid one (e.g. a non-`https` URL) is
dropped. All other fences (`js`, `ts`, `sh`, …) are untouched.

Here is a real, themed embed rendered from a fence:

```iframe
https://ankdev.me/clean-jsdoc-theme/api-docs/ title="clean-jsdoc-theme API example" height=420
```

## Authoring form 2 — the `@iframe` doc-comment tag

In source comments, use the `@iframe` block tag. Same grammar — first token URL,
then `key=value`:

```js
/**
 * A live demo of the renderer.
 *
 * @iframe https://example.com/embed/demo title="Renderer demo" aspectRatio=16/9
 */
export function render() {}
```

`@iframe` is handled by `embedBlocks` in
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts).
Each valid `@iframe` becomes an `<Embed>`; the block renders **after** the
symbol's `@example` section. You can have more than one `@iframe` on a doclet.

> [!IMPORTANT]
> `@iframe` is not a tag base JSDoc knows, so your config must set
> `tags.allowUnknownTags: true` in `jsdoc.json` (this site's
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> does). Without it, JSDoc drops the tag before the theme ever sees it.

## Under the hood

`parseEmbedConfig` produces an `EmbedSpec`; the `embed` builder in
[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
emits a self-closing `<Embed src="…" …/>` MDX JSX node (numbers/booleans
stringified, `undefined` fields omitted so the component applies its defaults).
rang registers `Embed` in
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx);
the component renders a `data-island="embed"` marker that dwar's loader hydrates.
Both the live iframe and the click-to-load poster work with **no JavaScript** (a
`<noscript>` fallback iframe is included).

## See also

- [Custom tags](/components/overview) — `@iframe` alongside `@category` /
  `@order`, and the `allowUnknownTags` requirement.
- [Callouts](/components/callouts), [Steps](/components/steps),
  [Tabs](/components/tabs) — the other authoring primitives.
