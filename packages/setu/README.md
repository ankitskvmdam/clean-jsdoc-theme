# @clean-jsdoc-theme/setu

JSDoc → SiteManifest. Validates a salty doclet collection, walks the documentable kinds, and emits the structured `SiteManifest` that dwar consumes. Zero rendering knowledge — no HTML, no JSX, no file I/O.

For the full module map, layering rules, and extension guide, see [`docs/architecture.md`](./docs/architecture.md).

## Public API

```ts
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';

const manifest: SiteManifest = generateSite(saltyCollection, {
  pkg: { name: 'my-lib', version: '1.0.0' },
});
```

`generateSite(collection, opts?)` enumerates every documented `kind: 'class'` doclet and produces one `Page` per class with frontmatter, MDX body, slugified URL, and pre-extracted headings. Returns a full `SiteManifest` ready to hand to `dwar.render`.

### Legacy entry point

```ts
import { generateMdx } from '@clean-jsdoc-theme/setu';

const bodies: string[] = generateMdx(collection);
```

A thin compatibility wrapper that derives its array of body strings from `generateSite`. Prefer `generateSite` for new code.

### Lower-level helpers

The composer pieces are exported for tools that want to inspect or generate individual pages:

- `buildClassPage(collection, longname)` — one class → one `Page`.
- `enumerateClassLongnames(collection)` — unique documented class longnames.
- `extractHeadings(tree)` — mdast `Root` → `Heading[]` with slugified IDs.
- `buildNav(pages)`, `computeBuildId(pages)`, `splitLongnameForSlug(longname)`.

The class pipeline (`getClassView`, `classViewToMdast`, `classViewToMdx`, the mdast builders) is exported from the same surface.

## Pipeline placement

```
salty collection ──► setu.generateSite ──► SiteManifest ──► dwar.render ──► HTML/CSS/JS
                          ▲                                        ▲
                          │                                        │
                    schema + slug rules                     components from
                @clean-jsdoc-theme/utils                @clean-jsdoc-theme/rang
```

Slug rules (`slugifyHeading` / `slugifyPath`) live in `@clean-jsdoc-theme/utils` and are used by both setu (sidebar / TOC generation) and dwar (rendered heading anchors). Same rules → matching anchors on both sides.

## Current coverage

setu renders `kind: 'class'` doclets today. Modules, mixins, namespaces, interfaces, typedefs, and globals are deferred — see the "What's next" section of the architecture doc. The view layer is shaped so each new kind is a mechanical addition (new `*-view.ts` + `mdast/*-view.ts` + a hook in `generateSite`).

## License

MIT.
