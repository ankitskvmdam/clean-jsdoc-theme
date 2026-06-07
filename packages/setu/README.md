# @clean-jsdoc-theme/setu

JSDoc → SiteManifest. Validates a salty doclet collection, walks the
documentable kinds, and emits the structured `SiteManifest` that dwar consumes.
Zero rendering knowledge — no HTML, no JSX, no file I/O.

For the full module map, layering rules, and extension guide, see
[`docs/architecture.md`](./docs/architecture.md).

## Public API

```ts
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';

const manifest: SiteManifest = generateSite(saltyCollection, {
  pkg: { name: 'my-lib', version: '1.0.0' },
  readme: readmeHtml,      // optional: rendered to the home page
  tutorials: tutorialTree, // optional: rendered as guide pages
  sources: sourceFiles,    // optional: rendered as source-viewer pages
});
```

`generateSite(collection, opts?)` enumerates every documented container symbol,
produces one `Page` per symbol (frontmatter, MDX body, slugified URL,
pre-extracted headings), wires the nav grouped by kind, and returns a full
`SiteManifest` ready to hand to `dwar.render`.

### Legacy entry point

```ts
import { generateMdx } from '@clean-jsdoc-theme/setu';

const bodies: string[] = generateMdx(collection);
```

A thin compatibility wrapper that derives its array of body strings from
`generateSite`. Prefer `generateSite` for new code.

### Lower-level helpers

The composer pieces are exported for tools that want to inspect or generate
individual pages:

- `buildContainerPage(collection, longname, kind, sourceLink?, resolveLink?)` — one container symbol → one `Page`.
- `buildGlobalsPage(collection, …)` — the aggregated globals page (or `null`).
- `enumerateLongnamesByKind(collection, kind)` — unique documented longnames of a kind.
- `extractHeadings(tree)` — mdast `Root` → `Heading[]` with slugified IDs.
- `buildNav(pages)`, `computeBuildId(pages)`, `splitLongnameForSlug(longname)`.
- `buildReadmePage`, `buildTutorialPages`, `buildSourceModel` — the prose / source surfaces.

The kind-parametric pipeline (`getContainerView`, `containerViewToMdast`, the
mdast builders) is exported from the same surface. The class-era names
(`buildClassPage`, `enumerateClassLongnames`, `getClassView`, `classViewToMdast`)
remain as thin aliases.

## Coverage

setu renders the five container kinds — **class, interface, mixin, module,
namespace** — through one kind-parametric path (class keeps its constructor-
params special case; class/interface walk the inheritance chain). On top of that:

- **Typedef** pages.
- One aggregated **Globals** page for global-scope symbols that don't own a page.
- **events / enums / constants** render as member sections within their parent page.
- The project **README** becomes the home page; **tutorials** become guide pages;
  documented **source files** become read-only viewer pages.

### Link resolution

`{@link}` / `{@linkcode}` / `{@linkplain}` and `@see` are rewritten into real
anchors. A two-pass build first registers every generated page (and its members)
into a link registry, then renders each page with a resolver closed over it — so
forward references resolve regardless of page order. A namepath resolves to its
symbol's slug (plus a `#member` heading anchor); external URLs link directly;
unresolved namepaths fall back to inline code.

## Pipeline placement

```
salty collection ──► setu.generateSite ──► SiteManifest ──► dwar.render ──► HTML/CSS/JS
                          ▲                                        ▲
                          │                                        │
                    schema + slug rules                     components from
                @clean-jsdoc-theme/utils                @clean-jsdoc-theme/rang
```

Slug rules (`slugifyHeading` / `slugifyPath`) live in `@clean-jsdoc-theme/utils`
and are used by both setu (sidebar / TOC generation) and dwar (rendered heading
anchors). Same rules → matching anchors on both sides.

## License

MIT.
