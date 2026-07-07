---
title: Configuration
group: Using the Theme
order: 4
---

# Configuration

Every theme option lives under `opts` in your `jsdoc.json` (or, for TypeDoc,
under the `cleanJsdocTheme` block in `typedoc.json` — see [JSDoc vs
TypeDoc](#jsdoc-vs-typedoc) just below). Setting up the rest of the build is
covered in [JSDoc Getting Started](/theme/jsdoc-getting-started) and [TypeDoc Getting
Started](/theme/typedoc-getting-started); this page documents the theme's own options.

Each option below shows the snippet for both tools in tabs — pick the one that
matches your setup.

> [!WARNING]
> Unknown or misspelled options only **warn** by default (with a "did you mean?"
> hint) — the build continues. Set [`strict`](#strict) to turn those warnings
> into errors.

## JSDoc vs TypeDoc

Every option on this page is the same for both tools — only **where you put it**
differs. In JSDoc the theme options go under `opts`; in TypeDoc, under
`cleanJsdocTheme`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

Theme options live under **`opts`**, alongside JSDoc's own options:

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    // ↓ theme options
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

The theme is loaded as a plugin and selected as an output; its options live
under **`cleanJsdocTheme`**:

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  // ↓ theme options
  cleanJsdocTheme: {
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

</tabs>

The option names and values are identical — only the namespace changes:
**`opts`** (JSDoc) vs **`cleanJsdocTheme`** (TypeDoc). One exception: the
[`outputSourceFiles`](#outputsourcefiles) and
[`sourceLinkToComment`](#sourcelinktocomment) options sit under JSDoc's
`templates.default` and are JSDoc-only.

## Site & identity

### `siteName`

The title shown in the header — plain text, or a logo image.

**Expected:** a string, or a logo set object. The logo set keys are all
strings: `light` and `dark` are the logo URLs (or local paths) used in each
theme, `default` is the fallback when a theme-specific one isn't given, and
`alt` is the text shown if the image fails to load (and read by screen readers).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteName: "My Library" }
// or a logo that swaps with the theme:
opts: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteName: "My Library" }
// or a logo that swaps with the theme:
cleanJsdocTheme: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

</tabs>

Defaults to your package's `name`.

### `basePath`

The site root path the renderer prefixes onto every internal link and asset —
set it when the site is served under a sub-path rather than the domain root.

**Expected:** a string path. Defaults to `""` (served at the root).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { basePath: "/my-library" } // served at example.com/my-library/
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { basePath: "/my-library" } // served at example.com/my-library/
```

</tab>

</tabs>

### `siteUrl`

Your site's public base URL. When set, the build emits a **`sitemap.xml`** at the
output root — one entry per page (hidden source-viewer pages are excluded) — which
you can submit to search engines or reference from `robots.txt`. Without it, no
sitemap is generated.

**Expected:** an absolute `http(s)` URL. Only its **origin** is used for each
page's URL; the deploy sub-path comes from [`basePath`](#basepath), so the two
never double-count — a bare origin (`https://example.com`) and a full URL whose
path equals your `basePath` (`https://example.com/my-library`) both produce the
same, correct `<loc>` entries. Omit it (the default) for no sitemap.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteUrl: "https://example.com", basePath: "/my-library" }
// → sitemap.xml with https://example.com/my-library/… URLs
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteUrl: "https://example.com", basePath: "/my-library" }
```

</tab>

</tabs>

### `favicon`

A path to a favicon image. The bridge copies it to a content-hashed
`_assets/` asset and emits a `<link rel="icon">` (with a `type` derived from the
extension — `.svg` → `image/svg+xml`) into every page's `<head>`.

**Expected:** a string file path (`.svg`, `.png`, `.ico`, …), relative to the
working dir. Omitted → no favicon link.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { favicon: "./assets/logo-small.svg" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { favicon: "./assets/logo-small.svg" }
```

</tab>

</tabs>

> [!TIP]
> An **SVG** favicon needs this option — browsers only auto-discover a root
> `favicon.ico`, never an SVG. An SVG icon can also adapt to light/dark with a
> `@media (prefers-color-scheme: dark)` block inside the SVG.

## Content sources

### `readme`

A Markdown file rendered as the site **home page**.

**Expected:** a path string. (A root `docs/index.md` overrides it — see
[`docs`](#docs).)

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { readme: "./README.md" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { readme: "./README.md" }
```

</tab>

</tabs>

### `docs`

A directory of hand-written Markdown/HTML guides rendered as prose pages. The
folder layout drives each page's URL and sidebar group; per-file YAML
frontmatter (`title`, `group`, `order`, `slug`, `hidden`) overrides the
defaults, and a root `index.md` becomes the home page.

**Expected:** a path string (a directory).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docs: "./docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docs: "./docs" }
```

</tab>

</tabs>

### `docGroups`

The display order of the top-level **doc** groups in the sidebar.

**Expected:** an array of group-label strings.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

</tabs>

> [!TIP]
> This very site is built with the `docs` and `docGroups` options — its guides
> are plain Markdown files grouped into the sidebar sections you're browsing
> right now. Want to build something similar? Browse the source:
> [docs-site on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site).

### `defaultDocGroup`

The group label a doc lands in when it declares none (no frontmatter `group`
and no folder to humanize).

**Expected:** a single string.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultDocGroup: "Docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultDocGroup: "Docs" }
```

</tab>

</tabs>

### `tutorials`

The JSDoc `--tutorials` directory. Each tutorial becomes a guide page, grouped
under "Tutorials" in the sidebar.

**Expected:** a path string (a directory). Equivalent to JSDoc's `-u` flag.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { tutorials: "./tutorials" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { tutorials: "./tutorials" }
```

</tab>

</tabs>

## Sidebar & navigation

### `sectionOrder`

The order of **all** top-level sidebar sections — both your doc/category groups
and the API kind labels (Classes, Modules, …). Listed labels come first in the
given order; anything you omit is appended afterward.

**Expected:** an array of section-label strings.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
// Accepted but has NO effect under TypeDoc — see the note below.
cleanJsdocTheme: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

</tabs>

> [!NOTE]
> Under **JSDoc**, `sectionOrder` orders doc/tutorial groups and the API kind
> sections. Under **TypeDoc** it has **no effect at all** — that sidebar is a
> module/folder hierarchy with its own fixed ordering, and doc groups there are
> ordered by [`docGroups`](#docgroups), not `sectionOrder`. See
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor).

### `clubSidebarItems`

Collapse related entries (e.g. a module and its members) under a shared,
collapsible parent, grouped by the path segment before the first `/`.

**Expected:** a boolean. Defaults to `false`.

> [!NOTE]
> `clubSidebarItems` has no effect on the TypeDoc API tree. See
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { clubSidebarItems: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { clubSidebarItems: true }
```

</tab>

</tabs>

### `menu`

Custom links pinned above the sidebar navigation.

**Expected:** an array of entries. Each is an object with `title`, a `link` (or
`href`), an optional `id`, and an optional `icon` — `lucide:<name>` or
`simpleicons:<name>`, loaded from a CDN. Two optional fields control link
presentation: `target` (the link target — an external link defaults to `_blank`)
and `class` (extra CSS class(es) merged onto the rendered link).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    // Open in the same tab + tag with a custom class for styling via customCss:
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

</tabs>

### `pageNav`

The prev/next pager at the foot of each content page — two cards linking the
adjacent pages in sidebar reading order. On by default; source-viewer pages never
show it.

**Expected:** a boolean shorthand, or an object `{ enabled }`. Defaults to `true`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { pageNav: false }
// or the object form: opts: { pageNav: { enabled: false } }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { pageNav: false }
// or the object form: cleanJsdocTheme: { pageNav: { enabled: false } }
```

</tab>

</tabs>

## Appearance & assets

### `fonts`

Override the type families.

**Expected:** an object with `heading`, `body`, and/or `mono`. `heading` and
`body` are Google Font family names (loaded for you, existence-checked at build
time); `mono` is a CSS font stack.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

</tabs>

### `colors` and `darkColors`

Recolor the theme. `colors` is the light-mode palette (also the `:root`
default); `darkColors` is the dark-mode palette, emitted under
`[data-theme="dark"]`. Each merges **per key** over the built-in palette, so you
can override just `bg` and keep every other default.

**Expected:** an object with any subset of these keys, each a CSS color string
(the theme ships [oklch](https://oklch.com), but any valid CSS color works):

| Key         | Role                                            |
| ----------- | ----------------------------------------------- |
| `bg`        | Page background                                 |
| `bgMuted`   | Subtle surfaces (code blocks, cards, sidebar)   |
| `fg`        | Body text                                       |
| `fgMuted`   | Secondary / muted text                          |
| `accent`    | Links, focus rings, primary buttons             |
| `accentFg`  | Text/icon on an `accent` background             |
| `border`    | Hairlines and dividers                          |
| `codeHeaderBg`    | Code-block header strip background        |
| `codeHeaderFg`    | Code-block header label text              |
| `codeHighlightBg` | Highlighted code-line background (`@playground` / `highlight=`) |

The three `code*` keys style the code-block chrome — the header strip (its
background + the `CODE`/filename label) and the tint on a highlighted line. They
default to a neutral `#f7f7f7`-equivalent in light and elevated greys in dark, so
you only set them to match a custom palette.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

</tabs>

Unknown keys and non-string values are ignored. If you omit `darkColors`
entirely, dark mode falls back to a sensible bg/fg swap of `colors`.

### `customCss` and `customJs`

Inline CSS/JS injected into every page. Custom CSS loads **after** the theme
stylesheet (so it overrides); custom JS runs **last**.

**Expected:** a string.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

</tabs>

### `customCssFile` and `customJsFile`

Like the above, but read from a file on disk. The bridge copies each to a
content-hashed asset and links it.

**Expected:** a path string.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

</tabs>

### `hashCustomAssets`

Whether custom-asset filenames are content-hashed (for cache-busting). Set
`false` to keep stable, unhashed names.

**Expected:** a boolean. Defaults to `true`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { hashCustomAssets: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { hashCustomAssets: false }
```

</tab>

</tabs>

### `footer`

A custom site footer, rendered in place of the default footer on every page.
Either an inline HTML string or `{ file: "./footer.html" }` — the bridge reads
the file at build time, so `render()` stays pure. It's trusted, author-controlled
HTML (rendered verbatim, like v4's `footer`); style it with
[`customCss` / `customCssFile`](#customcss-and-customjs), which load **after** the
theme stylesheet so your selectors win.

**Expected:** a string, or `{ file }`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { footer: "<div class='site-footer'>© 2026 My Library</div>" }
// or, for anything longer than a line:
opts: { footer: { file: "./footer.html" } }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { footer: "<div class='site-footer'>© 2026 My Library</div>" }
// or:
cleanJsdocTheme: { footer: { file: "./footer.html" } }
```

</tab>

</tabs>

### `meta`

Site-wide custom `<meta>` tags. Pass an array of attribute objects — each
object's key/value pairs become the attributes of one `<meta>` tag in `<head>`
(`name`/`content`, `property`/`content`, `http-equiv`, `charset`, …). The theme
emits `charset`/`viewport`/an auto `description` itself and **de-dupes**: an
author entry sharing an identifying attribute (`name` / `property` /
`http-equiv` / `charset`) replaces the theme's default rather than duplicating
it (so your `description` wins). Values are escaped automatically; invalid
attribute names are dropped. These are **site-wide** (no per-page meta yet).

**Expected:** an array of `{ [attr]: value }` objects.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  meta: [
    { name: "description", content: "Fast, typed docs for My Library" },
    { name: "keywords", content: "jsdoc, typescript, docs" },
    { property: "og:title", content: "My Library" },
    { property: "og:image", content: "https://example.com/card.png" },
    { name: "theme-color", content: "#0b0b0b" }
  ]
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  meta: [
    { name: "description", content: "Fast, typed docs for My Library" },
    { property: "og:title", content: "My Library" }
  ]
}
```

</tab>

</tabs>

## LLM & copy page

### `copyPage`

The per-page "copy page" / "open in LLM" button (content pages only).

**Expected:** a boolean shorthand, or an object `{ enabled, actions }` where
`actions` is any of `copy`, `view`, `claude`, `chatgpt`, `perplexity`. On by
default with all actions.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// or simply: opts: { copyPage: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// or simply: cleanJsdocTheme: { copyPage: false }
```

</tab>

</tabs>

### `aiPrompt`

A custom instruction prepended when a page is handed to an LLM via the open-in
actions.

**Expected:** a string.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

</tabs>

## Source files

> [!INFO]
> These two are **JSDoc-only**. They live under `templates.default` (JSDoc's
> default-template namespace), not under `opts` or `cleanJsdocTheme`.

### `outputSourceFiles`

Whether to generate the syntax-highlighted source-file viewer pages and the
`Source: file:line` links on members.

**Expected:** a boolean. Defaults to `true`; set `false` to suppress both.

```json5
templates: { default: { outputSourceFiles: false } }
```

### `sourceLinkToComment`

Where a `Source:` link lands: the symbol's **declaration** (default) or its
documentation **comment**.

**Expected:** a boolean. Defaults to `false` (land on the declaration).

```json5
templates: { default: { sourceLinkToComment: true } }
```

### How assets are handled

You don't configure this, but it's worth knowing how local files referenced from
your docs, tutorials, README, and **API doc comments** are processed. Any image
you link with a relative or root-relative path — `![diagram](./assets/flow.svg)` —
is copied into the site's `_assets/` directory under a **content-hashed** name
(e.g. `_assets/flow.3de65053.svg`) and the reference is rewritten to point at it.
The hash is derived from the file's bytes, so an unchanged file keeps a stable,
cacheable URL across builds and a changed one cache-busts automatically. External
(`https://…`) and `data:` URLs are left untouched. (See
[Working with images](/guides/working-with-images) for the full guide.)

`.svg` files get one extra step: their markup is **inlined** directly into the
page rather than loaded through an `<img>`. That lets an SVG's own
`[data-theme="dark"]` styles follow the in-page theme toggle — an `<img>`-loaded
SVG can only see the operating system's color scheme, never your site's toggle.

Logos ([`siteName`](#sitename)) and
[`customCssFile` / `customJsFile`](#customcssfile-and-customjsfile) ride the same
content-hashed `_assets/` pipeline.

#### JSDoc `staticFiles`

If you use JSDoc's standard `templates.default.staticFiles.include` to ship a
folder of images (the convention where files land at the output root and you
reference them by bare name, e.g. `![diagram](classes-io.png)`), the theme
honors it: those directories become **fallback search roots**, so a bare or
root-relative reference resolves and flows through the same content-hashed
`_assets/` pipeline above — no need to rewrite your comments to relative paths.
Any **non-image** files in those directories are still copied **verbatim** to the
site root, matching JSDoc's behavior. (A file the image pipeline already served
from `_assets/` isn't copied to the root a second time.)

## Localization

These two opt your site into a **multi-language** build — one static site per
locale, with a header language switcher and `hreflang` alternates wired in. They
declare the locales; the actual translation workflow (extracting catalogs,
translating, and building each locale) runs through the
[`clean-jsdoc`](/packages/aadesh-overview) CLI. The full walkthrough is in
[Localize your docs](/guides/localize-your-docs). A build with no `locales` is
unaffected — it renders exactly as before.

> [!INFO]
> Localized **builds** are JSDoc-only today. The TypeDoc bridge can *extract*
> catalogs but does not yet render the per-locale sites.

### `locales`

The languages to build.

**Expected:** an array of `{ code, name }` objects (the `name` is the switcher
label), or bare locale-code strings. Codes are BCP-47-ish (`en`, `pt-BR`).

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

</tabs>

### `defaultLocale`

The language rendered at the site root (every other locale lands under
`/<code>`).

**Expected:** a locale code that appears in [`locales`](#locales). Optional —
defaults to the first entry.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultLocale: "en" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultLocale: "en" }
```

</tab>

</tabs>

## Build

### `strict`

Escalate option diagnostics (a bad font name, an unknown key) from warnings to
hard build errors.

**Expected:** a boolean. Defaults to `false`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { strict: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { strict: true }
```

</tab>

</tabs>

### `progress`

Toggle the build's progress output (the per-stage spinners).

**Expected:** a boolean. Defaults to `true`.

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { progress: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { progress: false }
```

</tab>

</tabs>
