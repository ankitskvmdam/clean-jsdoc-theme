---
title: Steps
group: Components
order: 3
---

# Steps

> [!NOTE]
> **Where this works — prose & source comments.** Write `<steps>` markup in any
> prose (README, tutorials, the docs directory) **or** directly in a JSDoc /
> TypeDoc comment **description** — both flow through the same converter. There's
> no dedicated block tag; you write the same markup in either place.

`<steps>` renders a vertical, numbered stepper — the kind of "1, 2, 3" walkthrough
docs sites use for install / configure / build flows. You write lowercase
`<steps>` / `<step>` tags in your prose (or in a doc-comment description); the
theme rewrites them into the capitalized `<Steps>` / `<Step>` components rang
renders.

The rewrite happens at the raw-string level in
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
(`splitContainers` / `parseItems` / `expandContainers`), before the HTML
round-trip that would otherwise strip these custom tags. The components live in
[`Steps.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx).

> [!TIP]
> Want to see steps live? The [JSDoc Getting Started](/theme/jsdoc-getting-started) and
> [TypeDoc Getting Started](/theme/typedoc-getting-started) pages lay out their install
> walkthroughs as steppers — view either page's source on GitHub for a real,
> copyable example.

## Syntax

A `<steps>` container wraps one or more `<step>` items. Each step takes an
**optional** `label` attribute — a bold heading shown above the step body:

````markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build command and open the output.

</step>

</steps>
````

> [!IMPORTANT]
> Leave a **blank line around each step's inner content** (fenced code, lists,
> paragraphs). Each step's body is re-parsed as Markdown (`expandContainers`
> routes it back through the converter), so those blank lines are what let the
> content parse correctly.

## Attributes

Only one attribute is read, and only on `<step>`:

| Tag       | Attribute | Effect |
| --------- | --------- | ------ |
| `<step>`  | `label`   | Optional bold heading above the step body. Omit it for an unlabeled step. |

`readAttr` accepts either single or double quotes (`label="…"` or `label='…'`).
A `<step>` outside a `<steps>` renders nothing — `Step` is a logical marker that
`Steps` reads its props off directly; a stray one returns `null` rather than
leaking markup.

`Steps` is **SSR-only** static markup — there is no client JavaScript and no
hydration island. It is pure layout.

## Nesting other components

A step's body is re-parsed recursively, so you can nest **callouts**, **tabs**,
code blocks, and even another `<steps>` inside a step:

````markdown
<steps>

<step label="Choose your package manager">

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Heads up">

> [!TIP]
> Callouts work inside steps too.

</step>

</steps>
````

This is the same pattern the [JSDoc Getting Started](/theme/jsdoc-getting-started)
walkthrough uses — a `<tabs>` block nested inside a `<step>`.

## A real example, in a doc comment

The same markup works in a JSDoc / TypeDoc **description**. Here is the
`@module` comment that drives the live demo — a three-step walkthrough of the
`Cache` class, with a `<tabs>` install block and an `[!INFO]` callout:

`````js
/**
 * A small, fully-documented sample module …
 *
 * > [!INFO]
 * > Everything below is authored inline in the `@module` doc comment.
 *
 * ## Quick start
 *
 * <steps>
 *
 * <step label="Initialize the cache">
 *
 * Create a {@link Cache}, optionally capping how many entries it holds:
 *
 * ```js
 * const cache = new Cache({ maxSize: 2 });
 * ```
 *
 * </step>
 *
 * <step label="Store some values">
 *
 * `set()` returns the cache, so calls chain:
 *
 * ```js
 * cache.set('a', 1).set('b', 2);
 * ```
 *
 * </step>
 *
 * <step label="Read them back">
 *
 * ```js
 * cache.get('a'); // => 1
 * ```
 *
 * </step>
 *
 * </steps>
 *
 * @module sample-api
 */
`````

> [!TIP]
> See it rendered on the
> **[sample-api module page](/api-docs/module/sample-api)**
> in the live API demo — generated verbatim from
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js).

## See also

- [Tabs](/components/tabs) — the sibling tabbed-view container.
- [Callouts](/components/callouts) for `[!NOTE]`-style notices.
- [Build a guides site](/guides/build-a-guides-site) for where prose pages live.
