---
title: "@playground"
group: Authoring/Custom tags
order: 9
---

# `@playground` — open an example in a live playground

`@playground` turns an `@example` into a launchpad: the code block's header gains
an **"Open Code in"** dropdown that opens the code — prefilled — in **CodePen**,
**JSFiddle**, or **CodeSandbox**, all in the reader's browser (no backend, no API
key). The same tag also drives two presentation touches — a **`filename`** header
label and line **`highlight`ing** — that work with or without providers.

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

> [!IMPORTANT]
> Two prerequisites: (1) the feature is **off** until you enable `playground` in
> your `opts` — see [Add a playground](/guides/add-playgrounds); and (2)
> `@playground` is an unknown tag, so set `tags.allowUnknownTags: true` in your
> `jsdoc.json` or JSDoc strips it. (TypeDoc needs no flag.)

## Token grammar

The tag value is a list of whitespace-separated tokens, parsed by
`parsePlaygroundSpec` in
[`playground.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/playground.ts)
(the same tokenizer style as [`@iframe`](/authoring/custom-tags/iframe)):

| Token | What it does |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | Offer only these providers (your order is kept; duplicates and unknown names are dropped). |
| *(bare `@playground`)* | Use the default `providers` from `opts.playground`. |
| `none` / `off` | Opt this example **out** of the dropdown. |
| `filename=<name>` | Show `<name>` as the header label instead of `CODE`. |
| `highlight=1,4,8` | Highlight those 1-based lines. `highlight=[1,4,8]` also works. |

`filename` and `highlight` apply **even with `none`/no providers**, so you can
label and highlight a snippet without offering a playground at all.

## Interaction with `enableForAllExamples`

When `opts.playground.enableForAllExamples` is `true`, **every** `@example`
becomes a playground using the default `providers` — you don't need the tag at
all. Reach for `@playground` then only to:

- **narrow** an example to a provider subset (`@playground codepen`),
- **opt out** of one example (`@playground none` / `off`),
- add a `filename` / `highlight`.

## Worked examples & combinations

A provider subset, in your preferred order:

```js
/**
 * @example
 * greet("world");
 * @playground codepen jsfiddle
 */
```

Presentation only — a filename + highlight, **no** playground dropdown:

```js
/**
 * @example
 * const cfg = load("config.json");
 * applyConfig(cfg);
 * @playground none filename=config.js highlight=1
 */
```

Opt one example out when the whole site has playgrounds on
(`enableForAllExamples: true`):

```js
/**
 * @example
 * // pseudo-code, not runnable
 * doThing();
 * @playground off
 */
```

## In prose

Outside doc comments, `@playground` has two prose forms — the
` ```js playground ` fence and the `<playground>` container. Both, plus the full
`opts.playground` reference and per-provider options, are covered in
[Add a playground](/guides/add-playgrounds).

## See also

- [Add a playground](/guides/add-playgrounds) — the full feature: enabling it,
  the prose forms, and per-provider options.
- [`@iframe`](/authoring/custom-tags/iframe) — embed an **existing** pen/demo by URL.
- [Custom tags overview](/authoring/custom-tags) — the full tag list +
  `allowUnknownTags`.
