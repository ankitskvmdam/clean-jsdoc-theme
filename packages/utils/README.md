# @clean-jsdoc-theme/utils

The shared core every other package imports: the type contracts that define the
setu→dwar boundary and the slug rules used on both sides, plus one block of
**pure** runtime logic — opts validation, the build report, and the diagnostics
spine. It stays browser-safe (rang imports it into the browser) by **injection**:
the network (`fetch`) and the `node:zlib` gzip sizer are passed in by the caller,
never imported here.

## What's inside

```
src/
├── doclet-schema.ts   # JSDoc doclet shape (TDoclet, kinds, params, meta, …)
├── salty.ts           # salty (taffy) collection helpers + types
├── site/              # the setu↔dwar contract (types-first)
│   ├── page.ts        # Page (+ PageKind, 'source' body), Frontmatter, Heading
│   ├── manifest.ts    # SiteManifest, NavNode, SearchEntry, ExtractManifest, BuildSpec
│   ├── render.ts      # OutputFile, RenderOptions, RenderResult, RenderError, RenderWarning
│   ├── theme.ts       # ThemeTokens, ThemeColors, ThemeConfig, ComponentOverrides
│   ├── site-name.ts   # SiteName (text | logo set) + siteNameText / resolveSiteLogo
│   ├── islands.ts     # IslandName union + IslandPropsMap
│   └── slug-rules.ts  # slugifyHeading / slugifyPath / slugifySourcePath
└── config/            # PURE opts validation + build report (network/zlib injected)
    ├── diagnostics.ts # Diagnostic model + DiagnosticBag + formatDiagnostics
    ├── opts-schema.ts # zod schemas + THEME_OPT_KEYS
    ├── validate-opts.ts # validateThemeOpts → { value, diagnostics }
    ├── site-name.ts   # validateSiteName (shape only)
    ├── fonts.ts       # validateFonts (heading/body existence-checked; per-locale keys)
    ├── locales.ts     # validateLocales (opts.locales/defaultLocale → ValidatedLocales)
    ├── google-fonts.ts# createGoogleFontResolver (injectable fetch; fail-open)
    ├── suggest.ts     # near-miss "did you mean X?" key suggestions
    ├── report.ts      # formatBuildReport (per-route sizes + optional gzip)
    └── format.ts      # humanFileSize, byteLength, ANSI helpers
```

## Public API

The package is types-first; everything is re-exported from the barrel:

```ts
import type {
  SiteManifest,
  Page,
  PageKind,
  NavNode,
  SearchEntry,
  Frontmatter,
  Heading,
  OutputFile,
  RenderOptions,
  RenderResult,
  RenderError,
  ThemeConfig,
  ThemeTokens,
  ThemeColors,
  ComponentOverrides,
  SiteName,
  IslandName,
  IslandPropsMap,
  TDoclet,
} from '@clean-jsdoc-theme/utils';

import {
  // slug rules (shared by setu + dwar)
  slugifyHeading,
  slugifyPath,
  slugifySourcePath,
  // opts validation + build report (the bridges call these)
  validateThemeOpts,
  formatBuildReport,
  DiagnosticBag,
  formatDiagnostics,
  // the i18n contract (setu emits, aadesh reads)
  toExtractManifest,
} from '@clean-jsdoc-theme/utils';
```

### Slug helpers

- `slugifyHeading(text, registry?)` — heading text → anchor id. Pass a shared
  `Map` to dedupe colliding ids on a page (`-1`, `-2`).
- `slugifyPath(parts)` — longname parts → a URL path segment.
- `slugifySourcePath(path)` — a source file path → its `source/<file>` slug.

### Opts validation + report (`config/`)

- `validateThemeOpts(input)` → `{ value, diagnostics }` — normalizes + validates
  the theme options (zod schemas, a live Google-Font existence check, unknown-key
  "did you mean?" suggestions). The bridges call this early; a bad font/typo only
  warns unless `strict` escalates it.
- `formatBuildReport(input)` — the Next.js-style per-route size table (gzip sizer
  injected, so this module stays browser-safe).
- `DiagnosticBag` / `formatDiagnostics` — the diagnostics spine reused by setu,
  the bridges, and bhasha's validation primitives.

### The i18n / build contract

`ExtractManifest` + `toExtractManifest(manifest)` (what aadesh reads in extract
mode) and `BuildSpec` (the per-locale render spec) live here so setu, the
bridges, and aadesh all agree on the shape.

## Why it exists

The setu↔dwar contract lives here exactly once, so both sides import the same
shapes and can never drift. The slug rules are shared for the same reason: setu
generates the nav/TOC anchors and dwar emits the rendered heading ids — using one
implementation guarantees the two agree. The `config/` logic lives here (rather
than in a bridge) so JSDoc and TypeDoc validate options and print reports
identically.

## License

MIT.
