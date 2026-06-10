---
title: Getting Started
group: Getting Started
order: 1
---

# Getting Started

This guide walks through adding `clean-jsdoc-theme` to a JSDoc project and
configuring the most useful options.

> **🚧 Work in progress.** The full configuration reference is still being
> written. The options below are the ones you will reach for most often.

## Install

Install the theme alongside JSDoc as dev dependencies:

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

```sh
# or with pnpm
pnpm add -D jsdoc clean-jsdoc-theme
```

## Configure JSDoc

Point JSDoc at the theme with a `jsdoc.json` in your project root:

```json
{
  "source": {
    "include": ["./src", "./README.md"]
  },
  "plugins": ["plugins/markdown"],
  "opts": {
    "encoding": "utf8",
    "destination": "dist",
    "recurse": true,
    "template": "./node_modules/clean-jsdoc-theme",
    "readme": "./README.md",
    "siteName": "My Library"
  }
}
```

Then build your docs:

```sh
npx jsdoc -c jsdoc.json
```

The site is written to `dist/`. Open `dist/index.html` in a browser, or serve
the folder during development:

```sh
npx serve dist
```

## Common options

All theme options live under `opts` in `jsdoc.json`.

| Option                   | What it does                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `siteName`               | Site title shown in the header. Plain text, or a logo set (`{ default, dark, light, alt }`). |
| `readme`                 | Markdown file rendered as the site **home page**.                                            |
| `docs`                   | A directory of Markdown/HTML guides rendered as prose pages (see below).                     |
| `docGroups`              | Order of the top-level **doc** groups in the sidebar.                                        |
| `sectionOrder`           | Order of **all** top-level sidebar sections (doc groups and API kinds).                      |
| `menu`                   | Extra links shown above the sidebar nav (with optional icons).                               |
| `fonts`                  | Override `heading` / `body` (Google Fonts) and `mono` (CSS stack).                           |
| `copyPage`               | Toggle / configure the "copy page" + open-in-LLM button.                                     |
| `clubSidebarItems`       | Group related sidebar entries under a shared parent.                                         |
| `customCss` / `customJs` | Inline CSS/JS injected into every page. (`customCssFile` / `customJsFile` for files.)        |

### Adding prose pages

Set `opts.docs` to a directory and every `*.md` / `*.html` file in it becomes a
page. The filesystem layout drives the URL and the sidebar group:

```json
{
  "opts": {
    "docs": "./docs",
    "docGroups": ["Getting Started", "Guides"],
    "defaultDocGroup": "Docs"
  }
}
```

Per-file YAML frontmatter (`title`, `group`, `order`, `slug`, `hidden`) overrides
the directory-derived defaults. A root `docs/index.md` becomes the home page.

### Adding a sidebar menu

```json
{
  "opts": {
    "menu": [
      { "title": "Home", "link": "/", "icon": "lucide:home" },
      {
        "title": "GitHub",
        "link": "https://github.com/ankitskvmdam/clean-jsdoc-theme",
        "icon": "simpleicons:github"
      }
    ]
  }
}
```

Icons use the `lucide:` or `simpleicons:` prefix and are loaded from a CDN.
