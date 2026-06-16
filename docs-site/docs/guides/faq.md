---
title: FAQ
group: Guides
order: 8
---

# FAQ

Short, practical answers to the questions that come up most — embedding live
content, writing richer doc comments, and a few common configuration tweaks.
Each recipe links to the page with the full details.

## Embedding live content

The theme can drop a sandboxed `<iframe>` into any page — a CodePen, a YouTube
video, a StackBlitz, or any site. There are two ways to author one, and they
share [one config grammar](/components/embeds):

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

### How do I let readers open an example in CodePen / JSFiddle / CodeSandbox?

`@iframe` embeds an **existing** pen by URL. To open the **code from an
`@example`** — prefilled, no pen needed — use the **playground** feature instead:
turn it on in `opts.playground`, then tag the example with `@playground`:

```js
/**
 * @example
 * const out = resize(img, 200);
 * @playground codepen jsfiddle filename=resize.js highlight=1
 */
export function resize(img, width) {}
```

The code block's header gains an **"Open Code in"** dropdown (CodePen / JSFiddle /
CodeSandbox), all client-side — no API key. It also works in prose (a
` ```js playground ` fence or a `<playground>` block). Full walkthrough:
[Add a playground](/components/playground). (`@playground` needs
`tags.allowUnknownTags: true`, same as `@iframe`.)

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
`themed=false`. Full reference: [Embeds & live demos](/components/embeds).

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
`[!ERROR]` / `[!DANGER]` → error. See [Callouts](/components/callouts).

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

See [Steps](/components/steps) and [Tabs](/components/tabs) for the full syntax and
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

### My `@category` / `@order` / `@playground` / `@iframe` tags aren't working

The most likely cause: **`tags.allowUnknownTags` isn't `true`** in your
`jsdoc.json`. These are all tags base JSDoc doesn't define, so it **strips them
before the theme runs** — your categories collapse to the default kind sections,
`@order` does nothing, and `@playground` / `@iframe` never render. Set the flag:

```json
{ "tags": { "allowUnknownTags": true } }
```

(TypeDoc has no such restriction — it passes these through.) See [Custom
tags](/components/overview) for the full list.

### How do I add hand-written guides next to the API reference?

Point `opts.docs` at a folder of Markdown. See [Build a guides
site](/guides/build-a-guides-site) and [Combine guides +
API](/guides/combine-guides-and-api).

### How do I add a custom footer?

Set [`footer`](/theme/configuration#footer) to a string of HTML — it renders at
the bottom of every page, in place of the default footer:

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  footer: "<div class='site-footer'>© 2026 My Library — built with care</div>"
}
```

For anything longer than a line, hand it a file instead — it's read at build
time and keeps your config tidy:

```json5
opts: { footer: { file: "./footer.html" } }
```

**Style it with your own CSS.** The footer carries whatever classes you put in
your markup; style them with [`customCss` /
`customCssFile`](/theme/configuration#customcss-and-customjs), which the theme
loads _after_ its own stylesheet, so your rules win without `!important`:

```json5
opts: { footer: { file: "./footer.html" }, customCssFile: "./footer.css" }
```

```css
/* footer.css */
.site-footer { padding: 2rem 0; text-align: center; color: var(--clean-text-muted); }
.site-footer a { color: var(--clean-primary); }
```

Need behaviour (e.g. a dynamic year)? Add `customJs` / `customJsFile` — it runs
last, after the theme's own scripts. Most footers don't need it.

### How do I add custom meta tags (SEO, Open Graph, Twitter cards)?

Set [`meta`](/theme/configuration#meta) to an array of attribute objects. Each
object becomes one `<meta>` tag in every page's `<head>` — the keys are the
attributes:

```json5
opts: {
  meta: [
    { name: "description", content: "Fast, typed docs for My Library" },
    { name: "keywords", content: "jsdoc, typescript, documentation" },
    { name: "theme-color", content: "#0b0b0b" }
  ]
}
```

**Open Graph and Twitter cards** work the same way — they're just `<meta>` tags:

```json5
opts: {
  meta: [
    { property: "og:title", content: "My Library" },
    { property: "og:image", content: "https://example.com/social-card.png" },
    { name: "twitter:card", content: "summary_large_image" }
  ]
}
```

A few things worth knowing:

- **`charset` and `viewport` are already emitted** — you don't need to add them.
- **Your tag wins over the theme's default.** A `{ name: "description", … }`
  replaces the auto description; you won't get two.
- **These are site-wide** — the same tags render on every page (per-page social
  cards aren't supported yet).
- Values are escaped automatically, so quotes and angle brackets are safe.

### How do I set a favicon?

Point [`favicon`](/theme/configuration#favicon) at an image file. The theme copies
it to a content-hashed asset and adds a `<link rel="icon">` to every page's
`<head>`:

```json5
opts: { favicon: "./assets/logo.svg" }
```

This is the way to use an **SVG** favicon — browsers only auto-discover a root
`favicon.ico`, never an SVG, so it needs the `<link>` the theme emits. (An SVG
can even adapt to light/dark via a `@media (prefers-color-scheme: dark)` block
inside it.) The v4 `favicon` option was briefly dropped early in v5 and is back.

### How do I turn off the "copy page" / "open in LLM" button?

Configure or disable it with [`copyPage`](/theme/configuration#copypage).

### Why does my build warn about an unknown option?

Unknown or misspelled options **warn** by default (with a "did you mean?" hint)
and the build continues. Set [`strict`](/theme/configuration#strict) to turn
those warnings into errors.

## Localization

### How do I build a localized (multi-language) site?

Declare your languages in the same `opts` block and drive the build with the
`clean-jsdoc` CLI (the `@clean-jsdoc-theme/aadesh` package):

```json
{
  "opts": {
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" }
    ],
    "defaultLocale": "en"
  }
}
```

```sh
npm i -D @clean-jsdoc-theme/aadesh
clean-jsdoc i18n extract    # build the per-locale translation catalogs
# …translate the JSON (or `clean-jsdoc i18n prompt` for an LLM prompt)…
clean-jsdoc build           # render one static site per locale
```

You get one site per language (the default at the root, others under
`/<locale>`), a header language switcher, and `hreflang` tags. Prose is localized
by file — a `README.<locale>.md` home page and a `docs.<locale>/` overlay — and
fonts per locale via `"ja:heading"`-style keys. The full walkthrough is in
[Localize your docs](/guides/localize-your-docs).

### I used to run `clean-jsdoc extract` — where did it go?

The localization commands now live under an `i18n` group, so the CLI has room to
grow beyond localization. Update your commands (and any `package.json` scripts):

| Old | New |
| --- | --- |
| `clean-jsdoc extract` | `clean-jsdoc i18n extract` |
| `clean-jsdoc prompt` | `clean-jsdoc i18n prompt` |
| `clean-jsdoc validate` | `clean-jsdoc i18n validate` |
| `clean-jsdoc build` | `clean-jsdoc build` (unchanged) |

`build` stays top-level because it renders your site whether or not you use
multiple locales — the per-locale fan-out is just what `build` does when
`opts.locales` is set. All flags are unchanged. Run `clean-jsdoc` with no
arguments for the interactive menu, which now groups the i18n steps together.

## Working with LLMs

### I use an LLM for development — how do I get the most out of clean-jsdoc-theme?

clean-jsdoc-theme is built to be **LLM-friendly**, in two directions:

- **Your generated site is readable by AI.** Every page emits a companion
  Markdown file (`<page>/index.md`), and a per-page **copy / open-in-LLM** button
  hands the clean `.md` straight to Claude / ChatGPT / Perplexity — so an
  assistant reads the exact same reference your users do. Tune the handoff with
  [`copyPage`](/theme/configuration#copypage) and
  [`aiPrompt`](/theme/configuration#aiprompt).
- **Setting up the theme is itself AI-assisted.** There's a downloadable
  [**skill**](/theme/llm-skill) that turns any coding assistant into a
  clean-jsdoc-theme expert — point your agent at it and it can write your
  `jsdoc.json`/`typedoc.json`, author guides with callouts/steps/tabs, structure
  the sidebar, wire up cross-links, set up localization, and debug a build, all
  from source-verified knowledge instead of guesswork. Drop the skill folder into
  your assistant (e.g. `.claude/skills/`) and just ask for what you want.

So whether the LLM is **reading** your docs or **building** them, you don't have
to do the translating — point it at the companion `.md` and the skill.
