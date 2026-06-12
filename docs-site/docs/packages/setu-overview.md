---
title: Overview
group: Packages/setu
order: 20
---

# `@clean-jsdoc-theme/setu`

`@clean-jsdoc-theme/setu` owns the first half of the theme's pipeline: it turns a
JSDoc/TypeDoc **doclet collection** into a structured **`SiteManifest`** — pages,
a nav tree, and the link resolution that ties them together. It is the
build-side counterpart to [dwar](/packages/dwar-overview), which renders the
manifest into HTML.

The single entry point is
[`generateSite(collection, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts):

```ts
function generateSite(collection: unknown, opts?: GenerateSiteOptions): SiteManifest;
```

> If you just want to use the theme, you never install this package directly —
> the JSDoc and TypeDoc bridges call it for you. It's an internal building block.
> See the [Packages](/packages) landing page for what you actually install, and
> [setu Examples](/packages/setu-examples) for the call shape.

## Why setu exists

A documentation build has two genuinely different jobs: **understanding the
symbols** (walking doclets, bucketing members, resolving cross-references,
shaping the sidebar) and **rendering pixels** (MDX compile, islands, HTML, the
search index). setu is the first job, isolated so it can be reasoned about and
tested without a renderer in sight.

Given a salty doclet collection, `generateSite`
([`generate-site.ts` is the engine](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))
produces:

- **One page per container symbol.** The container kinds —
  `module`, `namespace`, `class`, `interface`, `mixin`, `typedef` — each get a
  standalone page, enumerated in that fixed order (see `CONTAINER_KINDS` in
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)).
  Typedefs go through the exact same `getContainerView` /
  `renderContainerPage` path as classes.
- **One aggregated "Globals" page.** Every global-scope symbol that does not get
  its own page (functions, members, constants, enums, events) is rendered as a
  member section on one synthetic container
  ([`buildGlobalsView`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).
- **Prose / guide pages** from three free-form sources: the project README (the
  home page), a docs directory, and JSDoc tutorials
  ([`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)).
- **Read-only source-viewer pages** plus `Source: file:line` links back from
  each member, when the bridge supplies the project's source files
  ([`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)).
- **The nav tree** — the sidebar — grouped into sections by kind or by an
  authored `@category`, ordered by `sectionOrder` / `@order`
  ([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).
- **Resolved cross-references** for every `{@link}` / `@see` / `@tutorial`
  ([`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)).

## The contract boundaries

setu is deliberately fenced in. These are the boundaries you can verify in the
source, and they are what keep the build side independent of the render side.

- **It emits Markdown/MDX only — no HTML.** Every page body is serialized through
  [`toMdx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts),
  which converts an mdast tree to MDX-safe Markdown. It even ships a custom link
  serializer that *always* emits the resource form `[label](url)` and never the
  autolink form `<url>`, because a bare `<url>` would be parsed as JSX and abort
  dwar's MDX compile. setu never produces final HTML; that's dwar's job.
- **It does no I/O.** setu never touches the filesystem. The README arrives as a
  string, docs and source files arrive pre-read by the bridge, tutorials arrive
  as a normalized tree. `generate-site.ts` and `source-view.ts` both state in
  their comments that the module is pure — it only transforms the inputs it is
  given (no `fs`, no `cwd`).
- **It depends only on `utils`.** The only workspace dependency in
  [`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/package.json)
  is `@clean-jsdoc-theme/utils` (the shared boundary contract — `SiteManifest`,
  `Page`, `NavNode`, the slug rules). The rest are mdast/hast/markdown
  processing libraries. setu never imports **dwar** or **rang**; the dependency
  arrow points one way only.

## The two-pass link build

Pages link to each other, and a page can reference a symbol enumerated *after*
it. So `generateSite` builds in passes
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts),
[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)):

1. **Collect specs (one dedup pass).** It iterates `CONTAINER_KINDS` in order,
   builds each container's view + slug, and *merges* (rather than drops) any
   later container that collides on slug — so neither doclet's members or
   relations are lost. This is the one place dedup happens, so the registry and
   the rendered pages can never diverge.
2. **Populate the link registry, then build the resolver.** The registry is
   filled from the *exact surviving spec set* and is fully populated before any
   page body renders — so forward references resolve. The resolver
   (`makeLinkResolver`) handles exact longnames, a `module:`-prefix fallback both
   ways, and a unique short-name fallback that refuses to guess when a bare name
   is ambiguous.
3. **Render.** Each surviving view is rendered once (never rebuilt), threading
   the source-link resolver, the registry-backed link resolver, and the
   `@tutorial` resolver into the mdast.

The `buildId` on the manifest is a `{timestamp}-{hash}` digest over the pages'
slugs + bodies — content-stable, so dwar can cache-bust correctly.

## What comes back

`generateSite` returns a
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts):

```ts
interface SiteManifest {
  pages: Page[];
  nav: NavNode[];
  pkg?: { name?; version?; description?; repository?; homepage? };
  buildId: string;
}
```

The manifest is self-contained: dwar should never re-read the doclet database.
You hand this object straight to [`dwar.render()`](/packages/dwar-overview).

## Read the source

The maintainer wants you sent to the code — start here:

- **Package directory:**
  [packages/setu](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu)
  ·
  [packages/setu/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src)
- **The entry point + options:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  (`generateSite`, `GenerateSiteOptions`)
- **The build engine:**
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  (the two-pass build, `assembleNav`, `enumerateLongnamesByKind`, `buildGlobalsView`)
- **Container views:**
  [`class-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/class-view.ts)
  (`getContainerView`, kind-parametric)
- **Prose pages:**
  [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  (README → home, docs → guides, `tutorialsToDocInputs`)
- **Source viewer:**
  [`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)
- **Cross-references:**
  [`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)
- **MDX serialization:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  and the
  [`mdast/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src/mdast)
  directory

## Next

- [setu Examples](/packages/setu-examples) — the real call shape, from the two
  bridges that consume setu.
- [dwar Overview](/packages/dwar-overview) — the package that renders the
  `SiteManifest`.
- [utils Overview](/packages/utils-overview) — the shared boundary contract setu
  imports.
