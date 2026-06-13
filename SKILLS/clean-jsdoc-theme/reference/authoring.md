# Authoring rich content

All of these work in **prose** (README, tutorials, the `docs` directory). Several
also work directly inside **JSDoc/TypeDoc comment descriptions**. There is no
dedicated block tag for steps/tabs/callouts — you write the same markup in either
place and it flows through one converter.

Contents: [Callouts](#callouts) · [Steps](#steps) · [Tabs](#tabs) ·
[Embeds](#embeds) · [Custom doc-comment tags](#custom-doc-comment-tags).

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

See [content-and-sidebar.md](content-and-sidebar.md) for how `@category`/`@order`
feed the sidebar.
