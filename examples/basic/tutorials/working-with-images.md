# Working with Images

Tutorials can reference **local image files** the same way docs pages do. Use a
plain relative Markdown image and the theme copies the file into the built
site's `_assets/` directory (content-hashed for caching) and rewrites the
reference for you — no manual copying, no absolute URLs needed.

The image below lives in `img/data-flow.svg`, a sibling of this `tutorials/`
directory, so it is referenced with a `../img/` relative path:

![Data flow from Source through DataProcessor to Output](../img/data-flow.svg)

Because it is an SVG, the theme inlines it so its colors follow the light/dark
toggle (it draws with `currentColor`).

## How resolution works

The image `src` you write is resolved against the tutorials directory, exactly
as a docs image is resolved against its own folder:

| `src` you write | Resolves to |
| --- | --- |
| a relative path (`../img/...`) | relative to the tutorials directory |
| a root-relative path (`/img/...`) | the project root |
| an `http(s):` URL or `data:` URI | left untouched (external) |

Raw HTML image tags work too — the tag just above this section is written as
plain HTML rather than Markdown:

<img src="../img/data-flow.svg" alt="Data flow diagram" />

External URLs and `data:` URIs are always left exactly as written.

## JSDoc `staticFiles`

If you already keep images in a directory declared via JSDoc's
`templates.default.staticFiles.include` (this example declares `./img`), you can
reference them by their **bare output name** — the theme searches those
directories too and routes the image through the same `_assets/` pipeline:

![data-flow](data-flow.svg)

Any non-image files in those directories (this example ships a `data-flow.puml`
source alongside the SVG) are copied **verbatim** to the site root, matching
JSDoc's behavior.
