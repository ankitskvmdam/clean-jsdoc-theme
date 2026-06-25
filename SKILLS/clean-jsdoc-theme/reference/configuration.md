# Configuration reference

Every theme option. Identical for both tools — only the namespace differs:
**`opts.*`** (JSDoc) vs **`cleanJsdocTheme.*`** (TypeDoc).

> Unknown / misspelled keys only **warn** (with a "did you mean?" hint) and the
> build continues. Set `strict: true` to escalate warnings to hard errors.

Contents: [Site & identity](#site--identity) · [Content sources](#content-sources) ·
[Sidebar & navigation](#sidebar--navigation) · [Appearance & assets](#appearance--assets) ·
[LLM & copy-page](#llm--copy-page) · [Build](#build) ·
[JSDoc-only options](#jsdoc-only-under-templatesdefault-not-opts) ·
[Asset handling](#asset-handling-automatic--no-config).

## Site & identity

| Option | Type | Notes |
| --- | --- | --- |
| `siteName` | string \| logo set | Header title. Logo set: `{ light, dark, default, alt }` (URLs or local paths; dark/light swap via CSS). Defaults to the package `name`. Local logos are copied to content-hashed `_assets/`. |
| `basePath` | string | Root path prefixed onto every internal link/asset, for sub-path hosting (`/my-lib`). Default `""`. |
| `siteUrl` | string | Public base URL (e.g. `https://example.com`). When set, the build emits `sitemap.xml` at the output root — one entry per non-hidden page. Only the URL's **origin** is used; the sub-path comes from `basePath` (the two never double-count). Omit → no sitemap. |
| `favicon` | string | Path to a favicon image (`.svg`/`.png`/`.ico`/…). The theme copies it to a content-hashed `_assets/` file and emits `<link rel="icon">` (type derived from the extension). Needed for an SVG favicon — browsers only auto-discover a root `favicon.ico`. |

## Content sources

| Option | Type | Notes |
| --- | --- | --- |
| `readme` | path | Markdown rendered as the **home page** (slug `""`). A root `docs/index.md` overrides it. |
| `docs` | dir path | A directory of hand-written `.md`/`.markdown`/`.html` guides → prose pages. Folder layout drives URL + sidebar group (see [content-and-sidebar.md](content-and-sidebar.md)). |
| `docGroups` | string[] | Display order of top-level **doc** groups in the sidebar. |
| `defaultDocGroup` | string | Group a doc lands in when it declares none. |
| `tutorials` | dir path | JSDoc `--tutorials` tree → guide pages under a "Tutorials" group (sub-tutorials nest). Equivalent to JSDoc's `-u`. |

## Sidebar & navigation

See [content-and-sidebar.md](content-and-sidebar.md) for the full ordering model.

| Option | Type | Notes |
| --- | --- | --- |
| `sectionOrder` | string[] | Order of **all** top-level sections (kind labels AND doc/category groups). Listed first, rest appended. For kind labels it's also a filter — an **omitted kind label is dropped**; category/doc groups are never dropped by omission. |
| `clubSidebarItems` | boolean | Collapse related entries under a shared collapsible parent, grouped by the path segment before the first `/`. Default `false`. Applies **only** to kind-label fallback buckets, never to `@category`-built groups. |
| `menu` | entry[] | Custom links pinned above the sidebar. Each: `{ title, link (or href), id?, icon? }`. `icon` is `lucide:<name>` or `simpleicons:<name>` (CDN-loaded). When set, `menu` owns the auto Home/Source links (suppressed unless you list `{ id: "home" }` / `{ id: "source" }`). |

## Appearance & assets

| Option | Type | Notes |
| --- | --- | --- |
| `fonts` | `{ heading?, body?, mono? }` | `heading`/`body` are Google Font family names (loaded for you, existence-checked at build); `mono` is a CSS font stack. A key may be prefixed with a locale (`"ja:heading"`, `"hi:body"`) to override that font for one locale only — see [Localization](#localization). |
| `colors` | color map | Light-mode palette; merges **per key** over the built-in palette. Keys: `bg`, `bgMuted`, `fg`, `fgMuted`, `accent`, `accentFg`, `border`. Any valid CSS color (ships OKLCH). |
| `darkColors` | color map | Same keys, emitted under `[data-theme="dark"]`. Omit it and dark mode falls back to a sensible bg/fg swap. |
| `customCss` / `customJs` | string | Inline CSS/JS injected on every page. CSS loads **after** the theme stylesheet (overrides win); JS runs **last**. |
| `customCssFile` / `customJsFile` | path | Same, read from disk; copied to content-hashed `_assets/`. |
| `footer` | string \| `{ file }` | Custom footer HTML, rendered in place of the default footer on every page. Inline string or `{ file: "./footer.html" }` (read at build time). Trusted, author-controlled HTML; style it with `customCss`/`customCssFile`. |
| `meta` | `Array<{ [attr]: value }>` | Site-wide custom `<meta>` tags. Each object's key/value pairs become one `<meta>` (`{ name, content }`, `{ property, content }`, …). Theme defaults (charset/viewport/auto description) emit first; an author entry sharing a `name`/`property`/`http-equiv`/`charset` replaces the default (no dupes). Values escaped; invalid attr names dropped. |
| `hashCustomAssets` | boolean | Content-hash custom-asset filenames for cache-busting. Default `true`. |
| `playground` | boolean \| `{ enableForAllExamples?, providers?, codepen?, jsfiddle?, codesandbox? }` | Adds an "Open Code in" dropdown (CodePen/JSFiddle/CodeSandbox, client-side) to code-block headers. Off by default → byte-identical. `providers` ⊂ `codepen`/`jsfiddle`/`codesandbox`; per-provider records are site-wide options. Per-block opt-in via the `@playground` tag / ` ```js playground ` fence / `<playground>` (also `filename=`/`highlight=`); `enableForAllExamples` opts every `@example` in. See [authoring.md](authoring.md). |

## Localization

Opt into multi-language builds. These two opts live in the **same** `opts` /
`cleanJsdocTheme` block; the rest of the i18n workflow runs through the
`clean-jsdoc` CLI (see [localization.md](localization.md)).

| Option | Type | Notes |
| --- | --- | --- |
| `locales` | `(string \| { code, name? })[]` | The languages to build. `code` is the URL/path segment; `name` is the switcher label. Omit (or one entry) → a normal single-language build. |
| `defaultLocale` | string | Which `locales` code renders **unprefixed** (at the root); the others render under `/<code>`. Must be one of `locales`. |

With `locales` set, the [`clean-jsdoc`](localization.md) CLI builds one site per
locale. Per-locale **fonts** use the `fonts` map with a `"<code>:slot"` key;
per-locale **prose** uses sibling files (`README.<code>.md`, `docs.<code>/`).

## LLM & copy-page

| Option | Type | Notes |
| --- | --- | --- |
| `copyPage` | boolean \| `{ enabled, actions }` | The per-page copy / open-in-LLM button (content pages only). `actions` ⊂ `copy`, `view`, `claude`, `chatgpt`, `perplexity`. On by default with all actions. |
| `aiPrompt` | string | Instruction prepended when a page is handed to an LLM via the open-in actions. |

## Build

| Option | Type | Notes |
| --- | --- | --- |
| `strict` | boolean | Escalate option diagnostics (bad font, unknown key) from warnings to hard errors. Default `false`. |
| `progress` | boolean | Toggle per-stage build spinners. Default `true`. |

## JSDoc-only (under `templates.default`, NOT `opts`)

```json5
templates: { default: { outputSourceFiles: false, sourceLinkToComment: true, staticFiles: { include: ["resources/doc/img"] } } }
```

- `outputSourceFiles` (default `true`) — generate the source-file viewer pages
  and `Source: file:line` links.
- `sourceLinkToComment` (default `false`) — land a `Source:` link on the doc
  **comment** instead of the **declaration**.
- `staticFiles` (`{ include, exclude?, includePattern?, excludePattern? }`) —
  JSDoc's static-file passthrough. Included files are copied **verbatim** to the
  output root, and the include dirs become **fallback search roots** for image
  resolution, so a **bare** reference like `![](classes-io.png)` resolves and is
  hashed into `_assets/`. See [images.md](images.md).

## Asset handling (automatic — no config)

Local images referenced from **docs, tutorials, the README, and JSDoc/TypeScript
doc comments** (relative or root-relative `src`, Markdown or raw `<img>`) are
copied into `_assets/` under a **content-hashed** name and the ref is rewritten.
`.svg` files are **inlined** so their own `[data-theme="dark"]` styles follow the
in-page theme toggle (an `<img>` SVG can't). External (`https://`) and `data:`
URLs are left untouched, as is image syntax shown inside code spans/fences. Full
details (resolution rules, comments, `staticFiles`, sitemap): [images.md](images.md).
