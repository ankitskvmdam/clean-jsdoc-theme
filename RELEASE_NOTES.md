<!-- DRAFT — v5.0.0 release notes. Edit freely before publishing. -->

# clean-jsdoc-theme v5.0.0

**clean-jsdoc-theme v5 is a ground-up rewrite — a complete documentation suite, not a coat of paint on JSDoc's output.**

Point it at a **JSDoc** _or_ **TypeScript** project and it uses those tools only to collect your source comments; from there it takes over — building a structured model of your API and rendering a fast, modern, **LLM-friendly** static site. Server-rendered HTML, lazy-hydrated interactive islands, a built-in fuzzy command palette, full-text search, first-class light/dark themes, hand-written guides beside your reference, and now **multi-language** output.

> **Upgrading from v4?** v5 is a major, breaking release — but the migration is designed to be **mostly hands-off if you work with an LLM**. Drop our downloadable [`migrate-v4-to-v5` skill](./SKILLS/migrate-v4-to-v5) into your coding assistant and point it at **[MIGRATION.md](./MIGRATION.md)** + the machine-readable **[`migration-map.json`](./migration-map.json)** — both are authored for LLMs/codemods, so the assistant can lift, rename, and reshape your config and verify the build for you. Prefer to do it by hand? The same **[MIGRATION.md](./MIGRATION.md)** and short **[Breaking Changes](./docs/BREAKING_CHANGES.md)** list walk you through it. To stay on v4, pin `"clean-jsdoc-theme": "^4"`.

---

## ✨ What's new in `clean-jsdoc-theme`

### A real static-site generator, not a CSS theme

Every page is **server-rendered** to HTML and progressively enhanced with **lazy-hydrated Preact islands** — each island ships only to the pages that use it. No client framework on the wire, no build config to maintain. Light and dark themes ship out of the box on an OKLCH palette; bring your own colors, Google Fonts, logo, sidebar menu, and custom CSS/JS whenever you want them.

### Built for LLMs

Alongside every page, v5 emits a companion **`.md`** authored for machines to read — so your API reference is as legible to an AI as it is to a human. Every page also carries one-click actions to **copy the Markdown** or **open it straight in Claude, ChatGPT, or Perplexity** (all opt-out via `copyPage`).

LLM support runs deeper than the output, too. We ship downloadable, source-verified **[agent skills](./SKILLS)** you can drop into any coding assistant: an umbrella **`clean-jsdoc-theme`** skill (setup, the full config reference, authoring, the sidebar model, localization, and the package architecture) and a focused **`migrate-v4-to-v5`** skill. They turn an assistant into an expert that can scaffold your config, author your guides, structure your sidebar, and migrate a v4 project — correctly, the first time.

### Two kinds of search, zero setup

A **`Ctrl K` fuzzy command palette** ranks across titles, descriptions, and full page text, deep-links straight to any class member by name, and remembers your recent and favorite searches. Turn on an optional **Pagefind** full-text index with a single flag.

### Prose and API in one site

Hand-written Markdown **guides** sit right beside your auto-generated reference — one sidebar, one search index, one URL space. Point `opts.docs` at a folder of Markdown and the **folder layout + a little frontmatter** becomes your navigation. `{@link}`, `@see`, and `@tutorial` resolve to real cross-page anchors, and every member links to its exact **source line**.

### Rich authoring

Write richer doc comments and prose with first-class components: **callouts** (GitHub-style `> [!NOTE]` alerts), **`<Steps>`**, synchronized **`<Tabs>`**, and sandboxed live **embeds** (CodePen, YouTube, any site) via an `@iframe` tag or an ` ```iframe ` fence. Organize the sidebar with **`@category`**, **`@order`**, `sectionOrder`, `menu`, and `clubSidebarItems`; a prev/next pager links adjacent pages in reading order.

### A source viewer

Documented source files become read-only **Monaco-powered** viewer pages that open to the exact `#L<n>` you linked, themed to match the site.

### 🌍 Localization (i18n) — _new_

Ship your docs in **multiple languages**. Declare `opts.locales` / `opts.defaultLocale` and the **`clean-jsdoc`** CLI builds one static site per language — translated **UI chrome**, **API descriptions** (incl. parameter & return descriptions), and **prose** (a per-locale `README.<locale>.md` home and a `docs.<locale>/` overlay) — with a header **language switcher**, **per-language fonts**, and **`hreflang`** for SEO. A build with no locales is byte-identical to before. _(See "Developer preview" below for TypeDoc's localization status.)_

### Safer, clearer builds

Theme options are **validated** up front (typo suggestions, a live Google-Font existence check) and the build prints a **Next.js-style report** of per-route sizes (with gzip). A single page that fails to compile is skipped and reported — never aborting the whole build.

---

## 📦 The package suite

v5 isn't a single template — it's a small set of single-responsibility packages wired into a one-way `setu → dwar` pipeline, all **published to npm** and reusable. They ship in **lockstep** (one shared version).

**Core pipeline**

- **`clean-jsdoc-theme`** — the JSDoc template / entry point. JSDoc calls its `publish()` bridge, which orchestrates the pipeline and writes the site.
- **`@clean-jsdoc-theme/setu`** — turns the JSDoc doclet model into a structured `SiteManifest` (pages, nav, cross-resolved links). No I/O, no HTML.
- **`@clean-jsdoc-theme/rang`** — the Preact component library, MDX element map, and island registry that the renderer bundles.
- **`@clean-jsdoc-theme/dwar`** — a pure renderer: `SiteManifest` → HTML/CSS/JS (SSR + MDX + esbuild-bundled islands), plus a Pagefind hook.
- **`@clean-jsdoc-theme/utils`** — the shared type contracts, slug rules, and opts-validation/build-report core every package builds against.

**Localization**

- **`@clean-jsdoc-theme/aadesh`** — the **`clean-jsdoc`** CLI that drives the extract → translate → build workflow (`extract` / `prompt` / `validate` / `build`, plus an interactive menu).
- **`@clean-jsdoc-theme/bhasha`** — the pure, browser-safe i18n core (chrome catalog, the `t` translator, `LanguageProvider`, and the API key/hash scheme) shared by the build and the UI.

> Most users only ever install **`clean-jsdoc-theme`** (and `@clean-jsdoc-theme/aadesh` if they want multiple languages). The rest are internal building blocks — documented and reusable, but not something you wire up by hand.

---

## 🧪 TypeDoc support — Developer Preview

TypeScript projects can generate the **same site** through **`@clean-jsdoc-theme/typedoc`**, a plugin that feeds TypeDoc's reflections through the same `setu → dwar` core.

**This is a developer preview** — it's available to try today, but still maturing, so expect some rough edges. We're shipping it to gather real-world feedback; please give it a spin and [let us know what you find](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues).

---

## 🚀 Getting started

```sh
npm install --save-dev clean-jsdoc-theme jsdoc
```

```jsonc
// jsdoc.json
{
  "source": { "include": ["./src", "./README.md"] },
  "plugins": ["plugins/markdown"],
  "opts": {
    "destination": "dist",
    "recurse": true,
    "template": "node_modules/clean-jsdoc-theme/dist",
    "siteName": "My Library"
  }
}
```

```sh
jsdoc -c jsdoc.json
npx serve dist
```

Full docs: **[ankdev.me/clean-jsdoc-theme](https://ankdev.me/clean-jsdoc-theme)** · TypeDoc: **[/theme/typedoc-getting-started](https://ankdev.me/clean-jsdoc-theme/theme/typedoc-getting-started)** · Localization: **[/guides/localize-your-docs](https://ankdev.me/clean-jsdoc-theme/guides/localize-your-docs)**

---

## ⚠️ Breaking changes (from v4)

- **Options moved `opts.theme_opts.*` → `opts.*`** (the `theme_opts` block is gone; options are validated).
- **Renamed:** `base_url` → `basePath`, `sections` → `sectionOrder`; **reshaped:** `title` → `siteName` (string or logo set), `menu` entries → `{ id, title, link/href, icon }`.
- **Custom CSS/JS renamed** to `customCss`/`customCssFile` + `customJs`/`customJsFile`.
- **Removed:** the theme picker (`default_theme`/`fallback-*` — v5 ships light+dark + a toggle), `favicon`, `homepageTitle`, `meta`, `codepen`, `footer`, `sort`, and others; **search is always on**.
- **Output layout changed:** SSR HTML + a co-located `.md` per page; assets live under `_assets/` — v4-era hardcoded asset paths break.

Full mapping and before/after config: **[MIGRATION.md](./MIGRATION.md)** — or hand it to an LLM with the **[`migrate-v4-to-v5` skill](./SKILLS/migrate-v4-to-v5)** and let it do the rename/reshape/verify for you.

---

## 🙏 Thanks & feedback

v5 is a large rewrite — thank you to everyone who tested the alphas. Found a bug or have a request? [Open an issue](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues) or [start a discussion](https://github.com/ankitskvmdam/clean-jsdoc-theme). If the theme saves you time, consider [sponsoring](https://github.com/sponsors/ankitskvmdam).
