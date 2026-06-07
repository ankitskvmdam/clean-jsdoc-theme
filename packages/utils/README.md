# @clean-jsdoc-theme/utils

The dependency-free core every other package imports: the shared type contracts
that define the setu→dwar boundary, plus the slug rules used on both sides. No
runtime logic beyond slugification.

## What's inside

```
src/
├── doclet-schema.ts   # JSDoc doclet shape (TDoclet, kinds, params, meta, …)
├── salty.ts           # salty (taffy) collection helpers + types
└── site/
    ├── page.ts        # Page (+ PageKind, 'source' body), Frontmatter, Heading
    ├── manifest.ts    # SiteManifest, NavNode, SearchEntry
    ├── render.ts      # OutputFile, RenderOptions, RenderResult, RenderError
    ├── theme.ts       # ThemeTokens, ThemeColors, ThemeConfig, ComponentOverrides
    ├── site-name.ts   # SiteName (text | logo set) + siteNameText / resolveSiteLogo
    ├── islands.ts     # IslandName union + IslandPropsMap
    └── slug-rules.ts  # slugifyHeading / slugifyPath / slugifySourcePath
```

## Public API

The package is types-first; everything is re-exported from the barrel:

```ts
import type {
  SiteManifest, Page, PageKind, NavNode, SearchEntry, Frontmatter, Heading,
  OutputFile, RenderOptions, RenderResult, RenderError,
  ThemeConfig, ThemeTokens, ThemeColors, ComponentOverrides, SiteName,
  IslandName, IslandPropsMap, TDoclet,
} from '@clean-jsdoc-theme/utils';

import { slugifyHeading, slugifyPath, slugifySourcePath } from '@clean-jsdoc-theme/utils';
```

The only runtime exports are the slug helpers:

- `slugifyHeading(text, registry?)` — heading text → anchor id. Pass a shared
  `Map` to dedupe colliding ids on a page (`-1`, `-2`).
- `slugifyPath(parts)` — longname parts → a URL path segment.
- `slugifySourcePath(path)` — a source file path → its `source/<file>` slug.

## Why it exists

The setu↔dwar contract lives here exactly once, so both sides import the same
shapes and can never drift. The slug rules are shared for the same reason: setu
generates the nav/TOC anchors and dwar emits the rendered heading ids — using
one implementation guarantees the two agree.

## License

MIT.
