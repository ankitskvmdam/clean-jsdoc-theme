---
title: "@iframe"
group: Authoring/Custom tags
order: 8
---

# `@iframe` — embed a live demo from a source comment

`@iframe` embeds a sandboxed `<iframe>` — a CodePen, a StackBlitz, a YouTube
video, any live demo — straight from a doc comment. It's the source-comment form
of the embed feature; the prose ` ```iframe ` fence is its
[counterpart](/guides/embeds).

```js
/**
 * Renders the chart.
 *
 * @iframe https://example.com/embed/demo title="Live demo" height=420
 */
export function render() {}
```

Each valid `@iframe` becomes an `<Embed>` island, rendered **after** the symbol's
`@example` section. You can put **more than one** `@iframe` on a doclet.
Parsing is `parseEmbedConfig` /`embedBlocks` in
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
+ [`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts).

> [!IMPORTANT]
> `@iframe` is an unknown tag — set `tags.allowUnknownTags: true` in your
> `jsdoc.json` or JSDoc strips it before the theme runs. See the
> [overview](/authoring/custom-tags). (TypeDoc needs no flag.)

## Syntax

```
@iframe <url> key=value key="value with spaces" flag
```

- The **first** whitespace-delimited token is the **URL** (required).
- Every token after it is a `key=value` pair; values may be single- or
  double-quoted, and a quoted value may contain spaces.
- A bare token with no `=` is a `true` flag, but **only** for boolean keys; any
  other bare token warns and is ignored.

### Only `https://` URLs

For security, the URL must be **`https://`** or **protocol-relative** `//`.
Anything else — `http://`, a relative path, an empty/missing URL — makes the
parser return `null` and the embed is **dropped** (with a build warning).

## Options

| Key | Type | Notes |
| --- | --- | --- |
| `title` | string | iframe title (accessibility) + click-to-load poster label. |
| `width` | string | CSS width. Default `100%`. |
| `height` | number | Pixels. Default `400` when no `aspectRatio`. Non-numeric → dropped. |
| `aspectRatio` | string | e.g. `16/9`. Preferred over `height` when set. |
| `allow` | string | iframe `allow=` list, e.g. `"fullscreen; clipboard-write"`. |
| `sandbox` | string | Override the default sandbox token list. |
| `clickToLoad` | boolean | Show a poster button; load the iframe on click. |
| `themed` | boolean | Sync to the active theme. **On by default.** |

Unknown keys warn and are ignored; the embed still renders. The default sandbox
is `allow-scripts allow-same-origin allow-popups allow-forms`.

### Theme syncing — `themed` and `{theme}`

`themed` is **on by default** (pass `themed=false` to opt out). When on, the embed
re-points itself when the page theme flips, in priority order: a literal
**`{theme}`** token in the URL → `light`/`dark`; else an author `theme-id` query
param is left untouched; else `?theme-id=<theme>` is appended. So
`https://example.com/demo?ui={theme}` becomes `…?ui=dark` in dark mode.

## Worked examples

A CodePen embed (use the pen's **embed** URL):

```js
/**
 * @iframe https://codepen.io/USER/embed/PEN_ID title="CodePen demo" height=400
 */
export function widget() {}
```

A YouTube video with a responsive aspect ratio instead of a fixed height:

```js
/**
 * @iframe https://www.youtube.com/embed/VIDEO_ID title="Intro" aspectRatio=16/9
 */
export function intro() {}
```

A click-to-load poster (nothing loads until the reader clicks):

```js
/**
 * @iframe https://example.com/embed/demo title="Heavy demo" height=480 clickToLoad
 */
export function demo() {}
```

## See also

- [Embeds & live demos](/guides/embeds) — the shared config grammar in full, the
  prose ` ```iframe ` fence, and what `<Embed>` renders under the hood.
- [`@playground`](/authoring/custom-tags/playground) — open an `@example` in a
  live editor (vs embedding an existing URL).
- [Custom tags overview](/authoring/custom-tags) — the full tag list +
  `allowUnknownTags`.
