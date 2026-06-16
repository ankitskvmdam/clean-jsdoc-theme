---
title: Add a playground
group: Guides
order: 6
---

# Add a playground — open examples in CodePen / JSFiddle / CodeSandbox

In this guide you'll let readers run your examples without leaving the docs. With
the **playground** feature on, a code block grows an **"Open Code in"** button in
its header that opens the code — prefilled — in **CodePen**, **JSFiddle**, or
**CodeSandbox**. It all happens in the reader's browser (a form `POST` for
CodePen/JSFiddle, a parameterized link for CodeSandbox) — **no backend, no API
key**.

The same `@playground` tag also gives you two presentation touches that work
**with or without** providers: a **`filename`** header label and **line
`highlight`ing**.

## 1. Turn it on

The feature is **off** until you add `playground` to your `jsdoc.json` `opts`.
The shorthand `true` turns it on with defaults (every provider, opt-in per
example); the object form gives you control:

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  playground: {
    // Turn every @example into a playground (default false → opt-in per tag).
    enableForAllExamples: false,
    // Which providers to offer, in this order (default: all three).
    providers: ["codepen", "jsfiddle", "codesandbox"],
    // Site-wide per-provider options (see "Set provider options" below).
    codepen: { js_pre_processor: "babel", css_external: "https://unpkg.com/some.css" },
    jsfiddle: { resources: "https://unpkg.com/some.js", wrap: "b" },
    codesandbox: { dependencies: { lodash: "latest" } }
  }
}
```

A few things to know:

- `playground: false` (or omitting it) keeps output **byte-identical** — code
  blocks render exactly as before.
- `enableForAllExamples: true` opts **every** `@example` in (an example can still
  opt out with `@playground none`).
- `providers` sets the default set + order. Omit it for all three.

## 2. Tag an example

Add `@playground` to a doc comment, next to an `@example`. The grammar is a list
of whitespace-separated tokens (the same parser as
[`@iframe`](/guides/embeds)):

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

| Token | What it does |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | Offer only these providers (your order is kept). |
| *(bare `@playground`)* | Use the default `providers` from `opts.playground`. |
| `none` / `off` | Opt this example **out** (handy with `enableForAllExamples`). |
| `filename=<name>` | Show `<name>` as the header label instead of `CODE`. |
| `highlight=1,4,8` | Highlight lines 1, 4 and 8 (1-based). `highlight=[1,4,8]` also works. |

`filename` and `highlight` apply even with `none`/no providers — so you can label
and highlight a snippet without offering a playground at all.

> [!IMPORTANT]
> `@playground` is an **unknown tag** to base JSDoc, so set
> `tags.allowUnknownTags: true` in your `jsdoc.json` (the same flag `@iframe`
> needs) — otherwise JSDoc strips it before the theme runs. TypeDoc needs no such
> flag.

## 3. Use it in prose

Outside doc comments — in your `docs` folder, tutorials, or the README — there
are two authoring forms, because of how prose is processed:

**The ` ```js playground ` fence** works in the `docs` directory and **Markdown**
tutorials. Put `playground` (plus any tokens) after the language in the fence
info string:

````markdown
```js playground codepen filename=demo.js highlight=2
const out = resize(img, 200);
render(out);
```
````

**The `<playground>` container** works **everywhere**, including the README and
HTML tutorials. Wrap a single fenced code block:

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
> [`<steps>`/`<tabs>`](/components/steps)).

A bare prose `playground` (no provider tokens) offers **all** providers — prose
has no access to the site-wide `providers` default.

## 4. Set provider options

The per-provider records in `opts.playground` are passed straight to each
service's prefill API and apply to **every** playground on the site:

- **CodePen** — the [`/pen/define` prefill](https://blog.codepen.io/documentation/prefill/)
  fields: `js_pre_processor`, `js_external`, `css`, `css_external`, `html`,
  `editors`, `layout`, `title`, … The example code becomes the pen's JS.
- **JSFiddle** — the [post API](https://docs.jsfiddle.net/api/display-a-fiddle-from-post)
  fields: `resources` (comma-separated external URLs), `wrap`, `html`, `css`,
  `title`, `description`.
- **CodeSandbox** — the [define API](https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api):
  `dependencies` seed `package.json`; the example becomes `index.js`.

To recolor the header strip or the highlighted-line tint, set the `codeHeaderBg`
/ `codeHeaderFg` / `codeHighlightBg` keys under
[`colors` / `darkColors`](/theme/configuration#colors-and-darkcolors).

## See also

- [Custom tags](/components/overview) — `@playground` alongside `@iframe` /
  `@category` / `@order`, and the `allowUnknownTags` requirement.
- [Embeds & live demos](/guides/embeds) — `@iframe` / ` ```iframe ` for
  embedding an **existing** pen, video, or live demo by URL.
