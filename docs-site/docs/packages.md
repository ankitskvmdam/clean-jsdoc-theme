---
title: Packages
group: Packages
order: 1
---

# Packages

`clean-jsdoc-theme` v5 is a **pnpm + Turborepo monorepo**. Instead of one big
template, it is split into small, single-responsibility packages wired together
by a thin bridge. This keeps each piece independently testable and lets the same
core power both the JSDoc and TypeDoc entry points.

> **🚧 Work in progress.** This overview is intentionally brief — deeper docs for
> each package are on the way.

## The pipeline

The packages form a one-way pipeline. JSDoc (or TypeDoc) feeds a bridge, which
generates a site model, which is rendered to HTML:

```
JSDoc ──► bridge ──► setu.generateSite ──► SiteManifest ──► dwar.render ──► static site
                                                                ▲
                                                       components from rang
```

## Core packages

| Package                        | Why it exists                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@clean-jsdoc-theme/utils`** | The shared core. Holds the type contracts that define the boundary between every other package, the slug rules used for URLs and anchors, and pure option-validation + build-report logic. Browser-safe (no Node imports).                                                            |
| **`@clean-jsdoc-theme/setu`**  | Turns a JSDoc doclet collection into a `SiteManifest` — one MDX page per documented symbol (classes, interfaces, modules, namespaces, typedefs, globals) plus README, guide, and source pages, with `{@link}`/`@see` cross-references resolved. Emits Markdown only: no HTML, no I/O. |
| **`@clean-jsdoc-theme/rang`**  | The Preact component library. Owns every byte of page-shell HTML (header, footer, sidebar), the hydratable interactive **islands** (command palette, TOC, theme toggle, copy buttons, source viewer…), and the MDX element map. Styled with Tailwind utilities over CSS variables.    |
| **`@clean-jsdoc-theme/dwar`**  | The renderer. Takes a `SiteManifest` and produces the static site: server-rendered HTML, one ESM bundle per island, a stylesheet, and a fuzzy search index. It is **pure** — the only disk touch is the optional Pagefind step.                                                       |

## Entry points (bridges)

| Package                          | Why it exists                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`clean-jsdoc-theme`**          | The package JSDoc loads via `jsdoc -t clean-jsdoc-theme`. A thin orchestrator that wires `setu → dwar`, handles file I/O, validates options, and runs Pagefind. |
| **`@clean-jsdoc-theme/typedoc`** | The TypeDoc twin. A TypeDoc plugin that feeds the reflection tree through the **same** `setu → dwar` pipeline, so a TypeDoc project gets identical output.      |

## Reserved (stubs)

| Package                         | Why it exists                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **`@clean-jsdoc-theme/aadesh`** | Reserved CLI surface (`clean-jsdoc build`). A stub today — JSDoc's own `-t` flag is the supported entry point. |
| **`@clean-jsdoc-theme/bhasha`** | Reserved i18n surface. A stub today; scoped to a future release.                                               |

## Why split it up?

- **Clear boundaries.** `setu` never imports `dwar` or `rang`; `dwar` never
  re-reads doclets. Each package has exactly one job.
- **Reusable core.** Because the JSDoc and TypeDoc bridges share `setu → dwar`,
  both toolchains produce the same site with no duplicated rendering logic.
- **Testable in isolation.** A pure renderer and a pure generator can be unit
  tested without spinning up JSDoc.
