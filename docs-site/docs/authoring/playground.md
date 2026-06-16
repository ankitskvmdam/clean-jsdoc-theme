---
title: Playground (open in)
group: Authoring
order: 6
---

# Playground — open an example in CodePen / JSFiddle / CodeSandbox

A **playground** turns a code block into a launchpad: a code-block header gains an
**"Open Code in"** dropdown that opens the code, prefilled, in **CodePen**,
**JSFiddle**, or **CodeSandbox**. It all runs in the reader's browser — a form
`POST` (CodePen/JSFiddle) or a parameterized link (CodeSandbox), with **no
backend and no API key**.

> [!NOTE]
> **Where this works — API examples & prose.** Enable it from a source comment
> with the `@playground` block tag (on an `@example`), or in prose with a
> ` ```js playground ` fence / a `<playground>` container. All three share **one
> token grammar** and produce the same dropdown.

The same tag also drives two presentation extras that work **with or without**
providers: a **`filename`** header label and **line `highlight`ing**.

## Turning it on — `opts.playground`

The feature is **off** until you configure `playground` in your `jsdoc.json`
`opts`. The shorthand `true` turns it on with defaults (every provider; opt-in
per `@playground`); the object form gives you control:

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  playground: {
    // Turn every @example into a playground (default false → opt-in per tag).
    enableForAllExamples: false,
    // Which providers to offer, in this order (default: all three).
    providers: ["codepen", "jsfiddle", "codesandbox"],
    // Site-wide per-provider options (see "Provider options" below).
    codepen: { js_pre_processor: "babel", css_external: "https://unpkg.com/some.css" },
    jsfiddle: { resources: "https://unpkg.com/some.js", wrap: "b" },
    codesandbox: { dependencies: { lodash: "latest" } }
  }
}
```

- `playground: false` (or omitting it) keeps output **byte-identical** — code
  blocks render exactly as before.
- `enableForAllExamples: true` opts **every** `@example` in (an example can still
  opt out with `@playground none`).
- `providers` sets the default set + order. Omit it for all three.

## The `@playground` block tag

Add `@playground` to a doc comment alongside an `@example`. The grammar is a list
of whitespace-separated tokens (the same parser as [`@iframe`](/authoring/embeds)):

```js
/**
 * Resize an image to a target width.
 *
 * @example
 * const out = resize(img, 200);
 * render(out);
 * @playground codepen jsfiddle filename=resize.js highlight=2
 */
export function resize(img, width) {}
```

| Token | Meaning |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | Offer only these providers (author order honored). |
| *(bare `@playground`)* | Use the default `providers` from `opts.playground`. |
| `none` / `off` | Opt this example **out** of the dropdown (useful with `enableForAllExamples`). |
| `filename=<name>` | Show `<name>` as the code-block header label instead of `CODE`. |
| `highlight=1,4,8` | Highlight lines 1, 4 and 8 (1-based). `highlight=[1,4,8]` also works. |

`filename` and `highlight` apply even with `none`/no providers — so you can label
and highlight a snippet without offering a playground.

> [!IMPORTANT]
> `@playground` is an **unknown tag** to base JSDoc — set
> `tags.allowUnknownTags: true` in your `jsdoc.json` (the same flag `@iframe`
> needs), or JSDoc strips it before the theme runs. (TypeDoc needs no such flag.)

## In prose

Two authoring forms, because of how prose is processed:

**1. The ` ```js playground ` fence** — in the `docs` directory and **Markdown**
tutorials. Put `playground` (plus any tokens) after the language in the fence
info string:

````markdown
```js playground codepen filename=demo.js highlight=2
const out = resize(img, 200);
render(out);
```
````

**2. The `<playground>` container** — works **everywhere**, including the README
and HTML tutorials. Wrap a single fenced code block:

````markdown
<playground codepen jsfiddle filename="demo.js" highlight="2">

```js
const out = resize(img, 200);
render(out);
```

</playground>
````

> [!TIP]
> **Why two forms?** A fence's info string after the language (the "meta") is
> dropped when README/HTML prose is normalized, so the fence form only works for
> sources that arrive as raw Markdown (`docs`, Markdown tutorials). The
> `<playground>` container survives that normalization, so reach for it in the
> README. Leave a blank line around the inner fence (same rule as
> [`<steps>`/`<tabs>`](/authoring/steps)).

A bare prose `playground` (no provider tokens) offers **all** providers — prose
has no access to the site-wide `providers` default.

## Provider options

The per-provider records in `opts.playground` are passed straight to each
service's prefill API (site-wide — they apply to every playground on the site):

- **CodePen** — the [`/pen/define` prefill](https://blog.codepen.io/documentation/prefill/)
  fields: `js_pre_processor`, `js_external`, `css`, `css_external`, `html`,
  `editors`, `layout`, `title`, … The example code becomes the pen's JS.
- **JSFiddle** — the [post API](https://docs.jsfiddle.net/api/display-a-fiddle-from-post)
  fields: `resources` (comma-separated external URLs), `wrap`, `html`, `css`,
  `title`, `description`.
- **CodeSandbox** — the [define API](https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api):
  `dependencies` seed `package.json`; the example becomes `index.js`.

## Limitations (v1)

- **Per-provider options are site-wide.** A single `@example`/fence can pick
  *which* providers, but not override their options — that's planned for a later
  release.
- The dropdown needs JavaScript (it builds the prefill on click); with JS off the
  code block still renders normally, just without the "Open Code in" button.

## See also

- [Embeds & live demos](/authoring/embeds) — `@iframe` / ` ```iframe ` for
  embedding an **existing** pen, video, or live demo by URL.
- [Custom tags](/authoring/custom-tags) — `@playground` alongside `@iframe` /
  `@category` / `@order`, and the `allowUnknownTags` requirement.
