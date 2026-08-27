# docs-site content map

> **Purpose / for the AI assistant.** This file is an index of the **prose
> documentation** in this site (NOT the generated API reference). It is **not
> published** — it lives at the docs-site root, outside `docs/` and outside
> `source.include` in `jsdoc.json`, so the build never picks it up. When asked to
> "update the docs on X", use this map to find the right file(s), then edit them.
> Keep this file in sync when pages are added, removed, or substantially change.

## How the docs are built

- Prose pages live in **`docs/`** (`opts.docs` in `jsdoc.json`). The folder layout
  + per-file frontmatter (`title`, `group`, `order`) drive the URL and sidebar.
- The site is **localized** into 4 languages. English is the source in `docs/`;
  translations are sibling **overlay** directories with the **same relative paths**:
  - `docs/` — English (en, the default locale)
  - `docs.hi/` — Hindi
  - `docs.ja/` — Japanese
  - `docs.zh/` — Chinese
- **⇒ When you edit a page, edit all four copies:** `docs/<path>` **and**
  `docs.hi/<path>`, `docs.ja/<path>`, `docs.zh/<path>`. Translate prose; keep code
  blocks, identifiers, option names, and image/link targets identical across
  locales (house style: technical terms stay in English within translated prose).
- Sidebar group order (`docGroups` / `sectionOrder` in `jsdoc.json`):
  **Using the Theme → Guides → Components → Packages**. Within a group, pages sort
  by `order` then title.
- `docs/index.md` is the **home page** (overrides the README).
- **LLM index files (`llms.txt` + `llms-full.txt`) are produced BY THE BUILD.** This
  site sets the **`llmsTxt`** opt (see `theme/configuration.md#llmstxt`), so every
  build emits them — nothing to run by hand, and each locale gets its own pair under
  its own prefix (`/`, `/hi`, `/ja`, `/zh`). The two API sub-sites set
  `llmsTxt: { "full": false }`: a complete index, but no multi-MB concatenation of
  every symbol page.
  - **Do NOT run `pnpm gen:llms` for this site any more.** That root script
    (`scripts/gen-llms-txt.mjs`) predates the feature and writes to the same
    `dist/clean-jsdoc-theme/llms.txt`, so running it after a build **overwrites** the
    generated file with a prose-only, English-only version. It survives only for
    writing an index into an unrelated target dir (e.g.
    `pnpm gen:llms ../ankdev/public/clean-jsdoc-theme`); it is a candidate for
    deletion.
  - Entries link each page's companion `.md`, and the `##` sections mirror the
    sidebar groups — so keeping `docGroups` / frontmatter `group` tidy keeps
    `llms.txt` tidy too.
- **Out of scope for this map:** the generated API references at `/api-docs/`
  (built from `jsdoc.api.json` + `docs-site/src`) and `/typedoc-api-docs/` (built
  from `typedoc.json` + `docs-site/typedoc-src`). Those come from source comments,
  not these `.md` files.

## Pages by group

### Home
| Page | File (under each locale dir) | Covers |
| --- | --- | --- |
| clean-jsdoc-theme | `index.md` | Landing page: what the theme is (a full docs suite for JS/TS via JSDoc **or** TypeDoc), feature highlights, the package map, entry points, where-to-next. |

### Using the Theme (`theme/`)
| Page | File | Covers |
| --- | --- | --- |
| Overview (1) | `theme/overview.md` | What the theme is and why it's split into packages; the `setu → dwar` pipeline at a high level. |
| JSDoc Getting Started (2) | `theme/jsdoc-getting-started.md` | Install + configure the JSDoc template; minimal `jsdoc.json`. |
| TypeDoc Getting Started (3) | `theme/typedoc-getting-started.md` | Install + configure the TypeDoc plugin (registered output). **Canonical home for TypeDoc-specific behavior:** the TypeDoc **sidebar model** (a module/folder hierarchy — unlike JSDoc's kind buckets) and **TypeDoc-specific rendering** — inheritance sections (Hierarchy / Implements / Implemented By) + Inherited-from / Overrides / Implementation-of member captions, `@group`, native TypeDoc `projectDocuments`, `@inheritDoc`, the async badge, object-literal→property-table expansion. Anchors: `#the-typedoc-sidebar`, `#typedoc-specific-rendering`. |
| **Configuration (4)** | `theme/configuration.md` | **The full option reference** — every `opts` / `cleanJsdocTheme` key: `siteName`, `fonts`, `colors`/`darkColors`, `basePath`, `siteUrl`, `llmsTxt`, `favicon`, `readme`, `docs`, `docGroups`, `defaultDocGroup`, `tutorials`, `sectionOrder`, `clubSidebarItems`, `collapsibleSidebarSections`, `menu`, `pageNav`, `copyPage`, `playground`, `scrollbar`, `customCss`/`customJs`(`File`), `hashCustomAssets`, `footer`, `meta`, `locales`/`defaultLocale`, plus "How assets are handled" (image pipeline + `staticFiles`). **Most config-option doc changes land here.** |
| Use with an LLM (5) | `theme/llm-skill.md` | LLM-friendliness: companion `.md` per page, the copy-page button, the downloadable agent skill. |
| Migrating v4 → v5 (6) | `theme/migrate-v4-to-v5.md` | v4 → v5 migration: breaking changes and option changes. |

### Guides (`guides/`)
| Page | File | Covers |
| --- | --- | --- |
| Build an API reference (1) | `guides/build-an-api-reference.md` | Pure-API workflow — point the tool at source, generate reference. |
| Build a guides site (2) | `guides/build-a-guides-site.md` | Prose-first workflow (how this very site is built). |
| Combine guides + API (3) | `guides/combine-guides-and-api.md` | Hand-written guides + generated API in one site/sidebar/search. |
| Structure your sidebar (4) | `guides/structure-your-sidebar.md` | The ordering engine: `sectionOrder`, `@category`, `@order`, `menu`, `clubSidebarItems`, `collapsibleSidebarSections` — the first four levers are **JSDoc-flavor**; `collapsibleSidebarSections` is the exception — it is **NOT TypeDoc-inert** and works under both flavors. Plus a **`#typedoc-flavor`** section: the TypeDoc API sidebar is a module/folder hierarchy where `@category`/`@order`/`sectionOrder`/`clubSidebarItems` have no effect (doc groups, `menu`, tutorials, and `collapsibleSidebarSections` still apply). |
| Localize your docs (5) | `guides/localize-your-docs.md` | i18n end-to-end: `locales`, the `clean-jsdoc` extract→translate→build flow, per-locale fonts, README/`docs.<locale>` overlays. |
| Working with images (6) | `guides/working-with-images.md` | Local image resolution from docs/tutorials/README/JSDoc+TS comments; `templates.default.staticFiles`; SVG theme-aware inlining; code-example safety. |
| FAQ (8) | `guides/faq.md` | Short practical answers to common questions. |

### Components (`components/`) — authoring building blocks
| Page | File | Covers |
| --- | --- | --- |
| Overview (1) | `components/overview.md` | Index of the authoring building blocks below. |
| Playground (2) | `components/playground.md` | Runnable in-page examples — `@playground`, provider selection (CodePen/JSFiddle/CodeSandbox). |
| Embeds (3) | `components/embeds.md` | Sandboxed iframes — the `@iframe` tag and the ` ```iframe ` prose fence. |
| Callouts (4) | `components/callouts.md` | Typed notice boxes — `> [!TIP]`/`[!WARNING]`/… and `<Callout>`. |
| Steps (5) | `components/steps.md` | `<steps>` / `<step label>` numbered stepper. |
| Tabs (6) | `components/tabs.md` | `<tabs>` / `<tab label>` tabbed view (also drives multi-tool code samples). |
| @order (7) | `components/order.md` | The standalone `@order N` within-group sort key. |
| @category (8) | `components/category.md` | `@category` — put a generated symbol page into an explicit sidebar group (**JSDoc sidebar**). Also documents **`@group`** (TypeDoc's sibling tag) and the caveat that neither drives the TypeDoc sidebar. |

### Packages (`packages/`) — one Overview (+ Examples) per published npm package
| Page | File | Covers |
| --- | --- | --- |
| utils — Overview / Examples | `packages/utils-overview.md`, `packages/utils-examples.md` | `@clean-jsdoc-theme/utils`: the shared contract (types, Zod schemas, slug rules, `SiteManifest`). |
| setu — Overview / Examples | `packages/setu-overview.md`, `packages/setu-examples.md` | `@clean-jsdoc-theme/setu`: doclets → `SiteManifest` (first half of the pipeline; internal). |
| rang — Overview / Examples | `packages/rang-overview.md`, `packages/rang-examples.md` | `@clean-jsdoc-theme/rang`: the Preact component library + island registry. |
| dwar — Overview / Examples | `packages/dwar-overview.md`, `packages/dwar-examples.md` | `@clean-jsdoc-theme/dwar`: `SiteManifest` → HTML/CSS/JS (second half; internal). |
| aadesh — Overview | `packages/aadesh-overview.md` | `@clean-jsdoc-theme/aadesh`: the `clean-jsdoc` CLI (localization commands). |
| bhasha — Overview | `packages/bhasha-overview.md` | `@clean-jsdoc-theme/bhasha`: the pure, browser-safe i18n core (catalog, `t`, key scheme). |

> **JSDoc vs TypeDoc flavor (cross-cutting).** Sidebar/ordering behavior differs
> by tool. The **JSDoc** template uses the kind/`@category` grouping engine
> (`sectionOrder`, `@category`, `@order`, `clubSidebarItems`). The **TypeDoc**
> plugin's API sidebar is a **module/folder hierarchy** where those levers have
> no effect (doc groups, `menu`, and tutorials still apply). When you change a
> claim about the sidebar, TypeDoc rendering, or these tags/options, scope it by
> flavor and keep the two TypeDoc homes in sync:
> `theme/typedoc-getting-started.md` and the `#typedoc-flavor` section of
> `guides/structure-your-sidebar.md`.

## Quick "where do I edit?" cheatsheet
- **A theme option** (jsdoc.json key) → `theme/configuration.md` (and link from the relevant guide).
- **TypeDoc-specific output/behavior** (the module-hierarchy sidebar; inheritance/Hierarchy/Implements sections; `@group`; `@inheritDoc`; native `projectDocuments`; the async badge; object-literal→property tables) → `theme/typedoc-getting-started.md`, plus the `#typedoc-flavor` section of `guides/structure-your-sidebar.md`. These are TypeDoc-flavor only — do **not** state them as JSDoc behavior.
- **An authoring feature** (callouts, tabs, steps, embeds, playground, `@category`, `@order`) → the matching `components/<x>.md`.
- **A workflow / how-to** → the matching `guides/<x>.md`.
- **A package's purpose or API examples** → `packages/<pkg>-overview.md` / `packages/<pkg>-examples.md`.
- **Getting started / migration / LLM usage** → `theme/<x>.md`.
- **The landing page** → `index.md`.

Always apply the edit to `docs/` **and** the `docs.hi/`, `docs.ja/`, `docs.zh/`
overlays at the same relative path.
