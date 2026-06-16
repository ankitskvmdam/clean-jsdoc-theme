---
title: Examples
group: Packages/setu
order: 21
---

# setu Examples

setu is **internal**. You don't call `generateSite` in a normal docs build — the
JSDoc and TypeDoc bridges call it for you. You reach for it directly only when
you're building a *custom bridge* (a new front-end that produces a salty doclet
collection). So the honest examples here are the two real bridges that ship with
the theme.

If you just want to configure the theme, see
[Configuration](/theme/configuration) and the [guides](/guides/build-an-api-reference)
instead.

## The call shape

Both bridges build a salty doclet collection, assemble an options object, and
call `generateSite`. Every field below is present on `GenerateSiteOptions` in
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
— nothing is invented.

This is the TypeDoc bridge, which is ESM all the way and imports setu directly
(from
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)):

```ts
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';

// reflections → flat doclets → a salty collection (the shape setu consumes).
const doclets = reflectionsToDoclets(project, logger);
const collection = salty.taffy(doclets);

const manifest = generateSite(collection, {
  ...(pkg ? { pkg } : {}),                         // package.json fields
  ...(readme ? { readme } : {}),                   // README HTML → home page
  ...(sources.length > 0 ? { sources } : {}),      // SourceFileInput[] → viewer pages
  ...(sectionOrder ? { sectionOrder } : {}),        // sidebar section order
  ...(menu ? { menu } : {}),                        // full sidebar menu
  ...(clubSidebarItems ? { clubSidebarItems } : {}),// prefix-group sidebar entries
});
```

The JSDoc bridge does the same, plus the options that only make sense from a
JSDoc run — tutorials, the docs directory, doc-group ordering, and the
source-link target (from
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)):

```ts
const manifest = generateSite(data, {
  ...(pkg ? { pkg } : {}),
  ...(readme ? { readme } : {}),
  ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
  ...(sources.length > 0 ? { sources } : {}),
  ...(sources.length > 0 && sourceLinkToComment ? { sourceLinkToComment } : {}),
  ...(docs.length > 0 ? { docs } : {}),
  ...(docGroups ? { docGroups } : {}),
  ...(defaultDocGroup ? { defaultDocGroup } : {}),
  ...(sectionOrder ? { sectionOrder } : {}),
  ...(menu ? { menu } : {}),
  ...(clubSidebarItems ? { clubSidebarItems } : {}),
});
```

Notice the pattern: every option is spread conditionally, so an absent feature
simply isn't passed. The **only required argument is the collection** — both
arguments to `generateSite` are otherwise driven by what the bridge found.

### The full option surface

Every field on `GenerateSiteOptions`
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)):

| Option | What it does |
| --- | --- |
| `pkg` | package.json fields embedded in the manifest (header/footer/OG tags). |
| `readme` | Project README **as HTML** → the site home page (slug `''`). |
| `tutorials` | A `TutorialInput[]` tree → guide pages under "Tutorials". |
| `docs` | A `DocInput[]` list (pre-read by the bridge) → prose/guide pages. A root `index` becomes the home page. |
| `docGroups` | Top-level doc-group display order. |
| `defaultDocGroup` | Group label for a doc page with no group. |
| `sources` | A `SourceFileInput[]` → read-only source-viewer pages + `Source:` links. |
| `sourceLinkToComment` | `true` → `Source:` links point at the doc-comment line, not the declaration (default `false`). |
| `sectionOrder` | One unified list ordering `@category` names, doc groups, and kind labels. |
| `menu` | Full sidebar menu (takes precedence over `sectionOrder`). |
| `clubSidebarItems` | Club related entries into one-level prefix subtrees. |

## What comes back, and where it goes

`generateSite` returns a
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
— `pages`, `nav`, an optional `pkg`, and a content-stable `buildId`:

```ts
const manifest = generateSite(collection, opts);
// manifest.pages   — Page[]  (one per symbol + globals + prose + source pages)
// manifest.nav     — NavNode[] (the sidebar tree)
// manifest.buildId — string  (timestamp + content hash, for cache busting)
```

> The manifest carries **no search index field**. setu's per-page bodies are what
> later feed search; the manifest itself is just `{ pages, nav, pkg?, buildId }`.

The next step is always the same: hand the manifest straight to
[`dwar.render()`](/packages/dwar-overview), which turns it into HTML. Both bridges
do exactly this:

```ts
import { render } from '@clean-jsdoc-theme/dwar';

const result = await render(manifest, { theme, destination });
await writeOutputFiles(destination, result.files);
```

setu produced the model; dwar renders it. The two never import each other — they
meet only at the `SiteManifest` type defined in
[utils](/packages/utils-overview).

## How authored features map to setu behavior

What you write in your source comments and docs files becomes manifest structure
here. A few connections worth knowing:

- **`@category` and `@order`.** An API symbol's `@category Core/Parsing order=1`
  tag becomes its sidebar group (a `/`-path nests it: `Core` ▸ `Parsing`) and its
  within-group sort key. A standalone `@order N` positions *any* symbol — even an
  untagged `@class` — within its kind section. Parsed in
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts).
  See [Structure your sidebar](/guides/structure-your-sidebar) and
  [Custom tags](/components/overview).
- **README → home.** Your README (rendered to HTML by JSDoc/TypeDoc) becomes the
  home page at slug `''`, via
  [`buildReadmePage`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).
  A root `index.md` in your docs directory overrides it.
- **Docs folder → guide pages.** Each Markdown/HTML file under your docs
  directory becomes a prose page at its clean (unprefixed) slug, grouped by its
  frontmatter `group` or its directory path, via
  [`buildDocPages`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).
  Frontmatter `title` / `group` / `order` / `hidden` are honored. See
  [Build a guides site](/guides/build-a-guides-site).
- **`{@link}` / `@see` / `@tutorial`.** Resolved against the link registry built
  in pass 2 — only targets that actually have a page or member heading resolve;
  the rest fall back to inert text rather than a broken anchor
  ([`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)).

## Read the source

These are the canonical, working usages — read them rather than trusting any
snippet above:

- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — builds the collection with `salty.taffy`, calls `generateSite`, hands the
  manifest to `render`.
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — the `publish(data, opts, tutorials)` entry JSDoc invokes; collects sources,
  docs, and tutorials, then calls `generateSite`.
- **The options type:**
  [`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)

## Next

- [setu Overview](/packages/setu-overview) — why setu exists and its contract
  boundaries.
- [dwar Overview](/packages/dwar-overview) — what consumes the `SiteManifest`.
- [Build an API reference](/guides/build-an-api-reference) — the end-to-end path
  these bridges power.
