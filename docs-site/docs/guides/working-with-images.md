---
title: Working with images
group: Guides
order: 6
---

# Working with images

Reference a local image from anywhere in your documentation — a docs page, a
tutorial, your README, or a JSDoc / TypeScript doc comment — and the theme copies
the file into the built site and rewrites the link for you. No copying files into
the output by hand, no absolute URLs required.

The diagram below is a local SVG in this site's `assets/` folder, referenced with
a root-relative path:

![The clean-jsdoc-theme build pipeline](/assets/build-pipeline.svg)

> [!TIP]
> This very page is the worked example — its source is
> [`docs-site/docs/guides/working-with-images.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/docs/guides/working-with-images.md).

## Where it works

Local image resolution applies to every prose source the theme renders:

- **Docs pages** (`opts.docs`) — the Markdown/HTML files that build a site like this one.
- **Tutorials** (`--tutorials`) — JSDoc's tutorial tree.
- **README** — the project README that becomes your home page.
- **API comments** — an image written in a JSDoc or TypeScript doc comment (a
  class / function / method description).

In every case you write a normal Markdown image (or a raw `<img>` tag) and the
theme handles the rest — there's nothing to configure.

## How a path is resolved

The `src` you write is resolved against the file it appears in:

| `src` you write | Resolves relative to |
| --- | --- |
| a relative path (`./img/x.svg`, `../img/x.svg`) | the source file's own directory |
| a root-relative path (`/assets/x.svg`) | your project root |
| an `http(s)://…` URL or a `data:` URI | left untouched (external) |

So a docs page resolves against its own folder, a tutorial against the tutorials
directory, the README against the project root, and an API comment against the
**source file the comment lives in**.

A resolved image is copied to `_assets/<name>.<hash>.<ext>` under a
**content-hashed** name (stable across builds, cache-busting on change) and the
reference is rewritten to point at it. A raw HTML `<img src="…">` is handled
exactly like a Markdown `![](…)`.

## In a JSDoc / TypeScript comment

API reference images aren't a special case — write a Markdown image straight into
a doc comment and it resolves against **the source file the comment lives in**,
then gets hashed into `_assets/` like any other:

```js
/**
 * Processes a data stream and emits the running total.
 *
 * ![Data flow](../img/data-flow.svg)
 *
 * @param {string[]} data - The items to process.
 * @returns {Promise<number>} The processed count.
 */
async function process(data) { /* … */ }
```

JSDoc's `plugins/markdown` renders that to an `<img>` before the theme ever sees
the comment, and TypeDoc doc comments work the same way.

## JSDoc `staticFiles`

JSDoc has a standard option for shipping a folder of static assets —
`templates.default.staticFiles.include` — where the files land at the output root
and you reference them by their **bare name** (`![diagram](classes-io.png)`),
typically from a directory like `resources/doc/img`:

```json5
// jsdoc.json
templates: { default: { staticFiles: { include: ["resources/doc/img"] } } }
```

The theme honors that convention: every directory you list there becomes a
**fallback search root**, so a bare (or root-relative) image reference resolves
and flows through the same content-hashed `_assets/` pipeline described above —
you don't have to rewrite existing comments or tutorials to relative paths. Any
**non-image** files in those directories (a `.puml` source, a PDF, …) are still
copied **verbatim** to the site root, matching JSDoc's behavior; an image the
pipeline already served from `_assets/` isn't copied to the root a second time.

> [!NOTE]
> `staticFiles` is a JSDoc option. With TypeDoc, keep your images beside the
> source or in your `docs` folder and reference them with a relative or
> root-relative path — they flow through the same `_assets/` pipeline.

## SVGs are theme-aware

`.svg` files get one extra step: their markup is **inlined** into the page rather
than loaded through an `<img>`. That lets an SVG's own `[data-theme="dark"]`
styles (or a `currentColor` fill) follow the in-page theme toggle — an
`<img>`-loaded SVG can only ever see the operating system's color scheme, never
your site's toggle. Flip this page between light and dark: the diagram above
recolors right along with it.

## Code examples are safe

Image syntax shown **as an example** — inside an inline `code span` or a fenced
block — is left exactly as written; only real images in prose are copied and
rewritten. That's why every `![…](…)` snippet on this page renders literally
instead of turning into an `_assets/` link.

## Next

- [Configuration → How assets are handled](/theme/configuration#how-assets-are-handled)
  — the underlying asset pipeline, shared with logos and custom CSS/JS.
- [Build a guides site](/guides/build-a-guides-site) — the prose-first workflow
  this site is built with.
