# Images & static assets

Local images referenced from **any prose the theme renders** — `opts.docs` pages,
tutorials, the README, and **JSDoc / TypeScript doc comments** — are copied into
the content-hashed `_assets/` pipeline and the reference is rewritten. Both
Markdown `![alt](src)` and raw `<img src="…">` are handled. No copying files into
the output by hand, no absolute URLs required.

## How a `src` resolves

| `src` you write | Resolved against |
| --- | --- |
| relative (`./img/x.svg`, `../img/x.svg`) | the **source it appears in** — a docs page's own folder; the tutorials dir; for a comment, the `.js`/`.ts` file the comment lives in |
| root-relative (`/assets/x.svg`) | the **project root** |
| `http(s)://…` URL or `data:` URI | left untouched (external) |

Resolved files are copied to `_assets/<name>.<hash>.<ext>` (content hash → stable,
cacheable URL; cache-busts when the bytes change) and the reference is rewritten
to point at it. Deduped — the same image referenced from several places is written
once.

## SVGs are theme-aware

`.svg` files are **inlined** into the page instead of loaded via `<img>`, so an
SVG's own `[data-theme="dark"]` styles (or a `currentColor` fill) follow the
in-page theme toggle — an `<img>`-loaded SVG only ever sees the OS color scheme.
Draw diagrams with `currentColor` to get light/dark for free.

## In a doc comment

Write a Markdown image straight into a JSDoc/TS comment; it resolves against the
**source file the comment lives in**:

```js
/**
 * Processes a data stream.
 *
 * ![Data flow](../img/data-flow.svg)
 *
 * @param {string[]} data - The items to process.
 */
```

JSDoc's `plugins/markdown` renders it to an `<img>` before the theme sees the
comment; TypeDoc doc comments work the same way.

## JSDoc `templates.default.staticFiles` (JSDoc only)

JSDoc's standard static-file option — where files land at the output root and you
reference them by **bare name** — is honored:

```json5
templates: { default: { staticFiles: { include: ["resources/doc/img"] } } }
```

- Each include dir becomes a **fallback search root**, so a bare (or
  root-relative) reference like `![diagram](classes-io.png)` resolves and flows
  through the `_assets/` pipeline — existing comments/tutorials need no rewrite to
  relative paths.
- **Non-image** files in those dirs (a `.puml` source, a PDF, …) are copied
  **verbatim** to the site root, matching JSDoc's behavior. A file already served
  from `_assets/` is not duplicated at the root.

TypeDoc has no `staticFiles` — keep images beside the source or in your `docs/`
folder and reference them with a relative / root-relative path.

## Showing image syntax in docs

Image syntax inside an inline `code span` or a fenced / `<pre>` / `<code>` block
is left **literal** — only real images in prose are copied and rewritten. So an
`![…](…)` you show **as an example** renders verbatim (no spurious copy, no
"could not read image" warning). You don't need to escape or rephrase it.

## sitemap.xml

Set **`siteUrl`** (e.g. `https://example.com`) and the build emits `sitemap.xml`
at the output root — one `<loc>` per non-hidden page (hidden source-viewer pages
excluded). Only the URL's **origin** is used; the deploy sub-path comes from
`basePath`, so the two never double-count. Omit `siteUrl` and no sitemap is
emitted. (Option lives in [configuration.md](configuration.md).)
