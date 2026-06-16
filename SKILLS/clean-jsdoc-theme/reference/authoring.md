# Authoring rich content

All of these work in **prose** (README, tutorials, the `docs` directory). Several
also work directly inside **JSDoc/TypeDoc comment descriptions**. There is no
dedicated block tag for steps/tabs/callouts — you write the same markup in either
place and it flows through one converter.

Contents: [Callouts](#callouts) · [Steps](#steps) · [Tabs](#tabs) ·
[Embeds](#embeds) · [Playground](#playground-open-in) · [Custom doc-comment
tags](#custom-doc-comment-tags).

## Callouts

GitHub-style alert blockquotes:

```markdown
> [!NOTE]
> Useful information, even when skimming.
```

Four variants; markers are case-insensitive and several keywords fold onto each:

| Marker | Variant |
| --- | --- |
| `[!INFO]` `[!NOTE]` `[!IMPORTANT]` | info (blue) |
| `[!TIP]` `[!SUCCESS]` | tip (green) |
| `[!WARNING]` `[!CAUTION]` | warning (amber) |
| `[!ERROR]` `[!DANGER]` | error (red) |

The marker must be the first thing in the blockquote; it's stripped from the
body. Bodies are full Markdown and callouts promote at any depth (incl. inside
list items). A `@deprecated` doc-comment tag **auto-emits** an error callout (with
a kind-aware default sentence when no reason is given).

## Steps

Numbered stepper (SSR, no JS):

```markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build and open the output.

</step>

</steps>
```

`label` is optional. **Leave a blank line around each step's inner content** —
each body is re-parsed as Markdown, so blank lines are what let fenced
code/lists/nested containers parse. You can nest tabs, callouts, code, even
another `<steps>` inside a step.

## Tabs

Tabbed view (SSR + a light enhancement island):

```markdown
<tabs group="pm">

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
```

- `<tab label>` — button text (falls back to `Tab N`).
- `<tab value>` — cross-block sync key; defaults to the normalized label, so
  **identical labels sync for free**.
- `<tabs group>` — opts the block into cross-block syncing: give multiple blocks
  the same `group` and switching one switches all (persisted across visits).

Same blank-line rule as steps.

## Embeds

Sandboxed iframes / live demos. Two authoring forms, **one config grammar**
(`<url> key=value flag`):

Prose fence:

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

Source-comment block tag (requires `tags.allowUnknownTags: true`):

```js
/** @iframe https://example.com/embed/demo title="Demo" aspectRatio=16/9 */
```

- **First token = URL.** Only `https://` or protocol-relative `//` URLs are
  accepted; anything else is dropped with a warning.
- Options: `title`, `width` (CSS, default `100%`), `height` (px, default `400`),
  `aspectRatio` (e.g. `16/9`, preferred over height), `allow`, `sandbox`,
  `clickToLoad` (poster instead of live iframe), `themed`.
- `themed` is **on by default**: a `{theme}` token in the URL is swapped for
  `light`/`dark`; else an author `theme-id` param wins; else `?theme-id=<theme>`
  is appended. Opt out with `themed=false`. Both live and click-to-load work with
  no JS (`<noscript>` fallback).

## Playground (open in)

Turn a code block into a launchpad: its header gains an **"Open Code in"**
dropdown that opens the code prefilled in **CodePen** / **JSFiddle** /
**CodeSandbox** (client-side form POST / link — no backend, no API key). The same
tag also sets a **`filename`** header label and **line highlighting**, which work
with or without providers.

Turn it on in `jsdoc.json` `opts` (off by default → byte-identical output):

```json5
opts: {
  playground: {
    enableForAllExamples: false,          // true → every @example; opt out per-tag with `none`
    providers: ["codepen", "jsfiddle", "codesandbox"],  // default + order
    codepen: { js_pre_processor: "babel" }              // site-wide per-provider options
  }
}
```

Three authoring forms, **one token grammar** (bare providers + `none`/`off`,
`filename=<name>`, `highlight=1,4,8`):

- **`@playground` block tag** on an `@example` (requires
  `tags.allowUnknownTags: true`):

  ```js
  /**
   * @example
   * const out = resize(img, 200);
   * @playground codepen jsfiddle filename=resize.js highlight=1
   */
  ```

- **` ```js playground … ` fence** — in the `docs` directory + Markdown tutorials.
- **`<playground …>` container** — works everywhere incl. README/HTML tutorials
  (the fence form's meta is stripped in README; the container survives). Same
  blank-line rule as `<steps>`/`<tabs>`.

A bare prose `playground` offers all providers (prose has no site-wide
`providers` default). v1 limitation: per-provider **options** are site-wide — an
example/fence picks *which* providers, not their options.

## Custom doc-comment tags

All three are **unknown tags** → require `tags.allowUnknownTags: true` in
`jsdoc.json` (without it JSDoc strips them before the theme runs):

- **`@category <path> [order=N]`** — put a symbol's page in an explicit sidebar
  group. The group path is the **leading whitespace-separated tokens joined with
  a single space** (so `@category Getting Started` is one flat group named
  "Getting Started"); parsing switches to `key=value` options at the first token
  containing `=`. A literal **`/` nests** (`Core/Parsing` → Core ▸ Parsing).
  First `@category` wins.
- **`@order N`** — within-group sort key for any symbol, including a plain
  `@module`/`@class` in its kind section. When both are present,
  `@category … order=` wins over a standalone `@order`.
- **`@iframe`** — see [Embeds](#embeds) above.
- **`@playground`** — see [Playground](#playground-open-in) above.

See [content-and-sidebar.md](content-and-sidebar.md) for how `@category`/`@order`
feed the sidebar.
