---
title: Examples
group: Packages/utils
order: 11
---

# Using `@clean-jsdoc-theme/utils`

> **Be honest with yourself first:** `@clean-jsdoc-theme/utils` is an internal
> building block. You almost never install it on its own. You reach for it when
> you're writing a **custom bridge** (your own entry point that drives
> `setu → dwar`), a **tool** that produces or inspects a `SiteManifest`, or a
> **component override** that needs the boundary types. If you just want docs,
> install an [entry point](/#the-packages) and set [options](/configuration) instead.

Everything is exported from the single package entry — there are no subpath
exports (`package.json` exposes only `.`), so all imports look like this:

```ts
import { slugifyHeading, validateThemeOpts } from '@clean-jsdoc-theme/utils';
import type { SiteManifest, Page, ThemeConfig } from '@clean-jsdoc-theme/utils';
```

## Import a contract type

When you build something that hands a `SiteManifest` to dwar (or consumes one),
import the boundary types. These are the exact shapes setu emits and dwar
renders — see
[`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
and
[`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts).

```ts
import type { SiteManifest, Page, NavNode } from '@clean-jsdoc-theme/utils';

// A hand-built manifest — what setu would normally produce for you.
const manifest: SiteManifest = {
  pages: [
    {
      slug: 'guides/intro',
      frontmatter: { title: 'Intro', kind: 'guide', group: 'Guides', order: 1 },
      body: '# Intro\n\nWelcome.',
    } satisfies Page,
  ],
  nav: [
    { label: 'Guides', children: [{ label: 'Intro', slug: 'guides/intro' }] },
  ] satisfies NavNode[],
  buildId: '2026-06-12-abc123',
};
```

A few things the types enforce, straight from the source:

- `Page.slug` is relative to the site root — no leading slash, no `.html`.
- `Page.body` is always an MDX string; `mdast` and `headings` are optional.
- `Frontmatter.kind` is a `PageKind` (`class` | `module` | `namespace` |
  `mixin` | `interface` | `typedef` | `global` | `index` | `guide` | `source`).
- `NavNode` is recursive: leaves carry a `slug`, branches carry `children`.

The theme contract lives in
[`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts):

```ts
import type { ThemeConfig } from '@clean-jsdoc-theme/utils';

const theme: ThemeConfig = {
  tokens: {
    colors: {
      bg: 'oklch(1 0 0)',
      bgMuted: 'oklch(0.97 0 0)',
      fg: 'oklch(0.2 0 0)',
      fgMuted: 'oklch(0.5 0 0)',
      accent: 'oklch(0.6 0.2 250)',
      accentFg: 'oklch(1 0 0)',
      border: 'oklch(0.9 0 0)',
    },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
  },
  basePath: '/docs/',
};
```

## Use a slug rule

Both setu and dwar slugify through the same functions so a sidebar link and the
heading anchor it points at can never disagree. Verified behavior from
[`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts):

```ts
import { slugifyHeading, slugifyPath, slugifySourcePath } from '@clean-jsdoc-theme/utils';

slugifyHeading('Hello, World!'); // 'hello-world'  (lowercased, punctuation dropped)
slugifyPath(['Foo Bar', 'Baz!']); // 'foo-bar/baz'
slugifySourcePath('src/Foo.js'); // 'src/foo-js'   (extension folded in, not stripped)
slugifySourcePath('lib\\util\\index.ts'); // 'lib/util/index-ts'  (backslashes normalized)
```

`slugifyHeading` takes an optional registry to dedupe repeated headings on a
page — pass one `Map` and reuse it across every heading:

```ts
const reg = new Map<string, number>();
slugifyHeading('Options', reg); // 'options'
slugifyHeading('Options', reg); // 'options-1'
slugifyHeading('Options', reg); // 'options-2'
```

To serve from a sub-directory, normalize the base path once and join links
through `withBase` (both are pure and fail safe to `'/'` — see
[`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts)):

```ts
import { normalizeBasePath, withBase } from '@clean-jsdoc-theme/utils';

const base = normalizeBasePath('https://example.com/docs/api/'); // '/docs/api'
withBase(base, '/guides/intro'); // '/docs/api/guides/intro'
withBase('/', '/guides/intro'); // '/guides/intro'  (unchanged at the root)
```

## Validate options (and wire the injectable fetch)

`validateThemeOpts` is the orchestrator a bridge runs before building. It never
throws: it returns normalized `value` plus a `DiagnosticBag` you decide what to
do with. See
[`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts).

The Google-Fonts existence check is the *only* networked piece, and it's
**injected** — you build a resolver with `createGoogleFontResolver()` and pass
it in. This is what keeps utils browser-safe (it never imports `fetch` itself).
Omit the resolver and font checks are skipped gracefully.

```ts
import {
  validateThemeOpts,
  createGoogleFontResolver,
  formatDiagnostics,
} from '@clean-jsdoc-theme/utils';

const fontResolver = createGoogleFontResolver(); // uses global fetch; fail-open + cached

const { value, diagnostics } = await validateThemeOpts({
  opts: { siteName: 'My API', fonts: { heading: 'Roboto', body: 'Roboto' } },
  fontResolver,
  unknownKeyPolicy: 'suggest-typos', // only flag near-miss typos of a known key
});

// value.siteName / value.fonts are normalized; decide your own policy on findings:
if (diagnostics.list.length > 0) console.log(formatDiagnostics(diagnostics, { color: true }));
if (diagnostics.hasErrors()) {
  // strict mode is the *caller's* choice — utils never throws
}
```

This is exactly how the real bridges wire it. The JSDoc bridge in
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
builds the resolver, calls `validateThemeOpts` with `unknownKeyPolicy:
'suggest-typos'` (JSDoc's own opts share the flat namespace), then logs the bag
and only throws when `opts.strict` is set *and* `diagnostics.hasErrors()`. The
TypeDoc plugin in
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
does the same but with `unknownKeyPolicy: 'warn-all'`, since its options live in
a dedicated namespaced block rather than a shared flat one.

For tests or a custom runtime you can inject a fake `fetch` instead of hitting
the network — the resolver only needs the minimal `FetchLike` slice
(`url`, optional `signal`/`headers`, returns `{ status }`):

```ts
const resolver = createGoogleFontResolver({
  fetch: async (url) => ({ status: url.includes('Roboto') ? 200 : 400 }),
});
await resolver('Roboto'); // 'exists'
await resolver('Made Up Font'); // 'missing'  (200 → exists, 400 → missing, else → 'unknown')
```

## Print a build report

After writing files, the bridge formats a Next.js-style summary with
`formatBuildReport`. Like the font check, the node-only dependency (gzip) is
**injected** so utils stays node-free — pass a `gzipSizer` and the gzip column
appears. See
[`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts).

```ts
import { formatBuildReport } from '@clean-jsdoc-theme/utils';
import { gzipSync } from 'node:zlib'; // the *caller* imports node, not utils

console.log(
  formatBuildReport({
    files: result.files, // OutputFile[] from dwar.render
    stats: result.stats,
    destination: './out',
    gzipSizer: (b) => gzipSync(b).length, // omit to hide the gzip column
    color: true,
  })
);
```

Both `publish.ts` and `write-site.ts` call it exactly this way — see lines
around the `formatBuildReport({ … gzipSizer })` calls in each bridge.

## The bigger picture

- [utils Overview](/packages/utils-overview) — what each export is for and why
  the package exists.
- [Packages](/#the-packages) — how utils fits the `setu → dwar` pipeline.
- [setu Overview](/packages/setu-overview) — produces the `SiteManifest` you
  see typed here.
- [dwar Overview](/packages/dwar-overview) — consumes it via `render()`.
