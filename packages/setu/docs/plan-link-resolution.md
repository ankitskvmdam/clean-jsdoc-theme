# Plan: Resolve `{@link}` / `@see` to real links

> Handoff for a remote session. Execute this **after**
> [`plan-render-all-kinds.md`](./plan-render-all-kinds.md) — resolution depends on
> every link target having a generated page.

## Context

JSDoc inline tags (`{@link}`, `{@linkcode}`, `{@linkplain}`) and the `@see` block
tag are used two ways in real codebases:
1. **External links** — `{@link https://… |label}`.
2. **Internal cross-references** — to a class/module/member, e.g.
   `{@link BaseEntity}`, `{@linkcode DataProcessor#streamEngine}`,
   `[end method]{@link base/chains#end}`, `@see base/chains#open`.

Today none of these become anchors. setu emits the raw text, and dwar's
`preprocessJsdocInlineTags` (`packages/dwar/src/mdx.ts`) converts `{@tag …}` into
an inline-code span purely so MDX's expression parser doesn't choke on the `{`.
The result is visible-but-inert text. We want real `<a>` links.

Concrete target semantics requested by the user: **`@see base/chains#open` should
link to the `base/chains` page with an `#open` hash.** Generalized: a namepath
resolves to its symbol's page slug, and a `#member` / `.member` suffix resolves to
that member's heading anchor on the page.

## Prerequisite

All kinds must render first (see the sibling plan). The fixture's link targets
point at modules (`module:documents/binder.bind`), classes (`BaseEntity`, `Queue`),
members (`base/chains#open`, `DataProcessor#streamEngine`), and module/namespace
symbols — most of which have **no page** until all-kinds work lands. Build the
registry on top of the complete page set.

## Decision (locked this session)

Resolve `{@link}` / `@see` on **all pages** — README (home) + tutorials + every API
page — not just class pages.

---

## Fixture link inventory (`examples/basic`)

The forms that appear in real source (`grep -rn "@link\|@see" examples/basic/src`):

| Form | Example | Meaning |
|---|---|---|
| `{@link target}` | `{@link BaseEntity}`, `{@link base/chains#close}` | namepath, label = target |
| `{@link target\|label}` | `{@link module:queue/types\|type definitions}` | explicit label |
| `{@link target label}` | (space-delimited variant) | explicit label |
| `[label]{@link target}` | `[end method]{@link base/chains#end}` | leading-label form |
| `{@linkcode target}` | `{@linkcode DataProcessor#streamEngine}` | label rendered monospaced |
| `{@linkplain target}` | — | label rendered plain |
| `{@link URL\|label}` | `{@link https://en.wikipedia.org/wiki/Data_model\|Data Modeling}` | external |
| `@see target` | `@see base/chains#open`, `@see User`, `@see utils/logger` | bare namepath |
| `@see {target}` | `@see {base#addDefaultOptions}`, `@see {base/chains#end}` | brace-wrapped namepath (no `@link`) |
| `@see {@link …}` | `@see {@link Queue} for the main engine.` | link tag inside `@see` |

Note: `base/chains` is a `@module` exporting a `@constructor`; members use
`@memberOf base/chains#` + `@name open`, so member longnames are `base/chains#open`,
`base/chains#end`, etc. Resolve via the registry against **actual generated
longnames** — don't reverse-engineer JSDoc namepath semantics.

---

## Design

### Registry — `packages/setu/src/link-registry.ts` (new)

`Map<longname, { slug: string; anchor?: string }>`, built from the pages setu
actually generates (so keys always match real output):
- Each page-level symbol: `longname → { slug }`.
- Each member doclet on that page: `member.longname → { slug, anchor:
  slugifyHeading(member.name) }` (e.g. `base/chains#open` →
  `{ slug:'…/base-chains', anchor:'open' }`).

**Build order matters.** Pages link to each other, so the registry must be fully
populated **before** any page body is rendered. Use a two-pass build in
`generateSite`: pass 1 builds all `ContainerView`s + slugs and populates the
registry; pass 2 renders each page's mdast with a resolver closed over the
registry. (Mirror how `sourceModel.resolve` is already built first and threaded
into class pages via `sourceLink`.)

**Known limitation — anchor dedup.** dwar's `rehypeSlugHeadings` and setu's
`extractHeadings` dedupe colliding heading slugs per page (`-1`, `-2`). The
registry derives anchors as bare `slugifyHeading(member.name)` without that
per-page counter, so a member whose name collides with another heading on the same
page may get a slightly-off anchor. Acceptable for v1; revisit by building anchors
from the same ordered walk the page renders if it bites.

### Resolver — `packages/setu/src/link-registry.ts`

`makeLinkResolver(registry)` → `resolveLink(target: string): ResolvedLink | null`:
- Trim. Strip a single wrapping `{ … }` (the `@see {namepath}` form).
- **URL** (`/^(https?:)?\/\//i` or `mailto:`) → `{ href: target, external: true }`.
- **Namepath** → `registry.get(target)`:
  - found → `{ href: hrefFor(slug, anchor), external: false }` where
    `hrefFor('', _) = '/'` and otherwise `/${slug}` + (`anchor ? '#'+anchor : ''`).
    Absolute paths match `Sidebar.tsx` (`href={`/${node.slug}`}`).
  - not found → `null` (caller falls back to inline code).

### Inline `{@link}` rewrite — `packages/setu/src/mdast/link-tags.ts` (new)

`resolveLinkTags(tree: Root, resolve)` — a single mdast walk over **phrasing**
content that rewrites text nodes, **skipping `code` and `inlineCode` subtrees** (so
`{@link}` shown inside examples stays literal). For each text node, split on:
- `[label]{@link|linkcode|linkplain target}` (leading-label form), and
- `{@link|linkcode|linkplain target( |\|)label?}`

For each match build:
- resolved → `link(href, …)` (children: `inlineCode(label)` for `@linkcode`, else
  `text(label)`; external links get the `MdxA` new-tab treatment automatically).
- unresolved → `inlineCode(label || target)` (preserves today's look).

Run it in **every page builder** after the mdast tree is assembled:
`buildContainerPage`, `buildGlobalsPage`, `buildReadmePage`, `buildTutorialPages`.

### `@see` — extend `seeInline` in `packages/setu/src/mdast/doclet.ts`

`seeInline(see, resolve?)` already half-handles `{@link …}`. Extend it to:
strip a wrapping `{ … }`, then `{@link …}` → parse target/label, else treat the
whole value as a bare namepath/URL → `resolve(value)`. Resolved → `link(…)`;
unresolved namepath → `inlineCode`/`text` (current behavior). Thread the resolver
through `DocletBlocksOptions.resolveLink` → `metadataList(doclet, resolve)` →
`seeInline`.

### Threading — mirror `sourceLink`

Add `resolveLink?: (target: string) => ResolvedLink | null` to
`DocletBlocksOptions` (`packages/setu/src/mdast/doclet.ts`). `generateSite` builds
one resolver from the registry and passes it into every page builder, exactly as it
already does with `sourceLink`.

### dwar safety net — leave in place

Keep `preprocessJsdocInlineTags` (`packages/dwar/src/mdx.ts`) as-is. Once setu
resolves links, only genuinely-unresolvable `{@link}` text could reach dwar, and
the code-span fallback keeps the page compiling.

### rang — no change expected

`MdxA` (`packages/rang/src/components/mdx-tags.tsx`) already opens
`^https?://` links in a new tab and styles internal links. Resolved external links
satisfy this automatically.

---

## Files

| File | Change |
|---|---|
| `packages/setu/src/link-registry.ts` | **new** — registry + `makeLinkResolver` + `hrefFor` |
| `packages/setu/src/mdast/link-tags.ts` | **new** — `resolveLinkTags` mdast pass + tag parsing |
| `packages/setu/src/generate-site.ts` | two-pass build; populate registry; run `resolveLinkTags` in each builder |
| `packages/setu/src/index.ts` | build resolver from registry; thread into builders |
| `packages/setu/src/mdast/doclet.ts` | `DocletBlocksOptions.resolveLink`; extend `seeInline` + `metadataList` |
| `packages/setu/src/mdast/class-view.ts` | pass `resolveLink` through (already extends `DocletBlocksOptions`) |
| `packages/setu/src/guide-view.ts` | run `resolveLinkTags` on README + tutorial trees |
| `packages/dwar/src/mdx.ts` | none (safety net stays) |

---

## Test plan

- **Unit (`link-registry`)**: URL → external; known namepath → `/slug`; namepath
  + `#member` → `/slug#anchor`; root slug → `/`; unknown → `null`; `{ns}` brace
  stripping.
- **Unit (`link-tags`)**: each fixture form parses to the right (label, target);
  `{@link}` inside `inlineCode`/`code` is left untouched; multiple tags +
  surrounding text in one node split correctly; `@linkcode` label is monospaced.
- **Integration**: a generated page where `@see base/chains#open` →
  `<a href="/…/base-chains#open">`, and `{@link https://… |x}` →
  external `<a target="_blank">`.
- All prior setu tests stay green.

## Verification

```sh
pnpm --filter @clean-jsdoc-theme/setu run typecheck
pnpm --filter @clean-jsdoc-theme/setu run test
cd examples/basic && pnpm run docs && pnpm dlx serve dist
```

In the served site, click an `@see`/`{@link}` cross-reference (e.g. on the
`base/chains` page) and confirm it navigates to the target page and scrolls to the
member anchor; confirm external `{@link}` URLs open in a new tab.
