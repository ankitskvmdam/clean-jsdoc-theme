---
title: FAQ
group: Guides
order: 5
---

# FAQ

Short, practical answers to the questions that come up most — embedding live
content, writing richer doc comments, and a few common configuration tweaks.
Each recipe links to the page with the full details.

## Embedding live content

The theme can drop a sandboxed `<iframe>` into any page — a CodePen, a YouTube
video, a StackBlitz, or any site. There are two ways to author one, and they
share [one config grammar](/authoring/embeds):

- **In prose** (README, guides, the `docs` folder) — an ` ```iframe ` fenced block.
- **In a doc comment** — the `@iframe <url> key=value` block tag.

The first token is the URL; the rest are `key=value` options — `title`, `height`
(px), `aspectRatio` (e.g. `16/9`), `width`, `allow`, `sandbox`, `clickToLoad`,
and `themed`. Only **`https://`** (or protocol-relative `//`) URLs are accepted.

### How do I embed a CodePen?

Use the pen's **embed** URL (`https://codepen.io/USER/embed/PEN_ID`):

````md
```iframe
https://codepen.io/USER/embed/PEN_ID title="CodePen demo" height=400
```
````

> [!TIP]
> On CodePen, open **Embed** and copy the URL from the `<iframe src="…">`
> snippet. Add `clickToLoad=true` to show a light poster until the reader clicks.

### How do I embed a YouTube video?

Use the **embed** URL (`https://www.youtube.com/embed/VIDEO_ID`) and give it a
16/9 aspect ratio instead of a fixed height:

````md
```iframe
https://www.youtube.com/embed/VIDEO_ID title="Intro video" aspectRatio=16/9
```
````

### How do I embed any other website?

Any `https://` URL works — set a `height` in pixels or an `aspectRatio`:

````md
```iframe
https://example.com title="Live preview" height=480
```
````

### How do I embed from a JSDoc / TypeDoc comment?

Use the `@iframe` block tag — it renders after the symbol's `@example`:

```js
/**
 * Renders the chart.
 *
 * @iframe https://codepen.io/USER/embed/PEN_ID title="Demo" height=400
 */
export function render() {}
```

> [!IMPORTANT]
> `@iframe` is an **unknown tag** to base JSDoc — set
> `tags.allowUnknownTags: true` in your `jsdoc.json`, or JSDoc strips it before
> the theme runs. (TypeDoc needs no such flag.)

### My embed isn't showing — what's wrong?

- The URL must start with **`https://`** (or `//`). Plain `http://` or a relative
  path is rejected, and the embed is silently dropped.
- Unknown option keys are ignored with a build warning — check spelling against
  the list above.

### Can I make it load on click instead of immediately?

Add `clickToLoad=true`: the reader sees a poster button (with a `<noscript>`
fallback) and the iframe loads on click. By default it loads immediately and
works with no JavaScript at all.

### Do embeds follow the light / dark theme?

By default, yes — the embed URL is re-resolved when the theme changes (a
`{theme}` token is swapped, or `?theme-id=<theme>` is appended). Opt out with
`themed=false`. Full reference: [Embeds & live demos](/authoring/embeds).

## Richer doc comments

Everything the theme does in prose also works **inside your JSDoc / TypeDoc
descriptions** — they flow through the same converter.

### How do I add a callout in a comment?

Write a GitHub-style alert blockquote right in the description:

```js
/**
 * Connects to the database.
 *
 * > [!WARNING]
 * > Call `close()` when you're done — connections are not pooled.
 */
export function connect() {}
```

The markers map to four styles: `[!NOTE]` / `[!INFO]` / `[!IMPORTANT]` → info,
`[!TIP]` / `[!SUCCESS]` → tip, `[!WARNING]` / `[!CAUTION]` → warning, and
`[!ERROR]` / `[!DANGER]` → error. See [Callouts](/authoring/callouts).

### Can I use steps or tabs in a comment?

Yes — the same `<steps>` (and `<tabs>`) markup works in a description; there's no
dedicated tag, you write the markup directly:

`````js
/**
 * @module my-api
 *
 * <steps>
 *
 * <step label="Install">
 *
 * ```sh
 * npm install my-api
 * ```
 *
 * </step>
 *
 * <step label="Use">
 *
 * ```js
 * import { go } from 'my-api';
 * ```
 *
 * </step>
 *
 * </steps>
 */
`````

See [Steps](/authoring/steps) and [Tabs](/authoring/tabs) for the full syntax and
the blank-line rule, and the live
[sample-api module page](/api-docs/module/sample-api) for it rendered.

### What about deprecation notices?

Just use `@deprecated` — the theme renders it as a callout automatically, no
marker needed:

```js
/**
 * @deprecated Use {@link connect} instead.
 */
```

## Configuration tweaks

### How do I use a logo instead of the site-name text?

Set `siteName` to a logo object with `light` / `dark` image paths (and an `alt`
fallback) — see [`siteName`](/theme/configuration#sitename).

### How do I control the sidebar grouping and order?

Use `@category` / `@order` on symbols, frontmatter `group` / `order` on guide
pages, and the `sectionOrder` option. [Structure your
sidebar](/guides/structure-your-sidebar) covers every lever.

### How do I add hand-written guides next to the API reference?

Point `opts.docs` at a folder of Markdown. See [Build a guides
site](/guides/build-a-guides-site) and [Combine guides +
API](/guides/combine-guides-and-api).

### How do I turn off the "copy page" / "open in LLM" button?

Configure or disable it with [`copyPage`](/theme/configuration#copypage).

### Why does my build warn about an unknown option?

Unknown or misspelled options **warn** by default (with a "did you mean?" hint)
and the build continues. Set [`strict`](/theme/configuration#strict) to turn
those warnings into errors.
