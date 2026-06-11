---
title: Configuration
group: Getting Started
order: 3
---

# Configuration

Every theme option lives under `opts` in your `jsdoc.json` (or, for TypeDoc, the
`cleanJsdocTheme` block in `typedoc.json`). The standard JSDoc options —
`source`, `plugins`, `template`, `destination`, `recurse` — are covered in
[Getting Started](/getting-started); this page documents the theme's own options.

> [!WARNING]
> Unknown or misspelled options only **warn** by default (with a "did you mean?"
> hint) — the build continues. Set [`strict`](#strict) to turn those warnings
> into errors.

## Site & identity

### `siteName`

The title shown in the header — plain text, or a logo image.

**Expected:** a string, or a logo set object. The logo set keys are all
strings: `light` and `dark` are the logo URLs (or local paths) used in each
theme, `default` is the fallback when a theme-specific one isn't given, and
`alt` is the text shown if the image fails to load (and read by screen readers).

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

Defaults to your package's `name`.

### `basePath`

The site root path the renderer prefixes onto every internal link and asset —
set it when the site is served under a sub-path rather than the domain root.

**Expected:** a string path. Defaults to `""` (served at the root).

```json5
opts: { basePath: "/my-library" } // served at example.com/my-library/
```

## Content sources

### `readme`

A Markdown file rendered as the site **home page**.

**Expected:** a path string. (A root `docs/index.md` overrides it — see
[`docs`](#docs).)

```json5
opts: { readme: "./README.md" }
```

### `docs`

A directory of hand-written Markdown/HTML guides rendered as prose pages. The
folder layout drives each page's URL and sidebar group; per-file YAML
frontmatter (`title`, `group`, `order`, `slug`, `hidden`) overrides the
defaults, and a root `index.md` becomes the home page.

**Expected:** a path string (a directory).

```json5
opts: { docs: "./docs" }
```

### `docGroups`

The display order of the top-level **doc** groups in the sidebar.

**Expected:** an array of group-label strings.

```json5
opts: { docGroups: ["Getting Started", "Guides"] }
```

> [!TIP]
> This very site is built with the `docs` and `docGroups` options — its guides
> are plain Markdown files grouped into the sidebar sections you're browsing
> right now. Want to build something similar? Browse the source:
> [docs-site on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site).

### `defaultDocGroup`

The group label a doc lands in when it declares none (no frontmatter `group`
and no folder to humanize).

**Expected:** a single string.

```json5
opts: { defaultDocGroup: "Docs" }
```

### `tutorials`

The JSDoc `--tutorials` directory. Each tutorial becomes a guide page, grouped
under "Tutorials" in the sidebar.

**Expected:** a path string (a directory). Equivalent to JSDoc's `-u` flag.

```json5
opts: { tutorials: "./tutorials" }
```

## Sidebar & navigation

### `sectionOrder`

The order of **all** top-level sidebar sections — both your doc/category groups
and the API kind labels (Classes, Modules, …). Listed labels come first in the
given order; anything you omit is appended afterward.

**Expected:** an array of section-label strings.

```json5
opts: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

### `clubSidebarItems`

Collapse related entries (e.g. a module and its members) under a shared,
collapsible parent, grouped by the path segment before the first `/`.

**Expected:** a boolean. Defaults to `false`.

```json5
opts: { clubSidebarItems: true }
```

### `menu`

Custom links pinned above the sidebar navigation.

**Expected:** an array of entries. Each is an object with `title`, a `link` (or
`href`), an optional `id`, and an optional `icon` — `lucide:<name>` or
`simpleicons:<name>`, loaded from a CDN.

```json5
opts: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

## Appearance & assets

### `fonts`

Override the type families.

**Expected:** an object with `heading`, `body`, and/or `mono`. `heading` and
`body` are Google Font family names (loaded for you, existence-checked at build
time); `mono` is a CSS font stack.

```json5
opts: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

### `customCss` and `customJs`

Inline CSS/JS injected into every page. Custom CSS loads **after** the theme
stylesheet (so it overrides); custom JS runs **last**.

**Expected:** a string.

```json5
opts: { customCss: ".my-banner { color: rebeccapurple; }" }
```

### `customCssFile` and `customJsFile`

Like the above, but read from a file on disk. The bridge copies each to a
content-hashed asset and links it.

**Expected:** a path string.

```json5
opts: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

### `hashCustomAssets`

Whether custom-asset filenames are content-hashed (for cache-busting). Set
`false` to keep stable, unhashed names.

**Expected:** a boolean. Defaults to `true`.

```json5
opts: { hashCustomAssets: false }
```

## LLM & copy page

### `copyPage`

The per-page "copy page" / "open in LLM" button (content pages only).

**Expected:** a boolean shorthand, or an object `{ enabled, actions }` where
`actions` is any of `copy`, `view`, `claude`, `chatgpt`, `perplexity`. On by
default with all actions.

```json5
opts: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// or simply: opts: { copyPage: false }
```

### `aiPrompt`

A custom instruction prepended when a page is handed to an LLM via the open-in
actions.

**Expected:** a string.

```json5
opts: { aiPrompt: "You are helping a developer use My Library. " }
```

## Source files

> [!INFO]
> These two live under `templates.default` (JSDoc's default-template namespace),
> not directly under `opts`.

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

## Build

### `strict`

Escalate option diagnostics (a bad font name, an unknown key) from warnings to
hard build errors.

**Expected:** a boolean. Defaults to `false`.

```json5
opts: { strict: true }
```

### `progress`

Toggle the build's progress output (the per-stage spinners).

**Expected:** a boolean. Defaults to `true`.

```json5
opts: { progress: false }
```
