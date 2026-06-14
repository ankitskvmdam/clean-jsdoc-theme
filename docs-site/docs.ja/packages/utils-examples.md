---
title: 例
group: Packages/utils
order: 11
---

# `@clean-jsdoc-theme/utils` を使う

> **まず自分に正直になりましょう:** `@clean-jsdoc-theme/utils` は internal な building
> block です。これを単独で install することはほぼありません。これに手を伸ばすのは、
> **custom bridge**（`setu → dwar` を駆動する自分専用の entry point）、`SiteManifest`
> を produce または inspect する **tool**、あるいは boundary types を必要とする
> **component override** を書いているときです。単に docs が欲しいだけなら、代わりに
> [entry point](/#the-packages) を install して [options](/theme/configuration) を
> 設定してください。

すべては単一の package entry から export されます — subpath exports はありません
（`package.json` は `.` のみを expose します）ので、すべての imports はこのように
なります:

```ts
import { slugifyHeading, validateThemeOpts } from '@clean-jsdoc-theme/utils';
import type { SiteManifest, Page, ThemeConfig } from '@clean-jsdoc-theme/utils';
```

## contract type を import する

dwar に `SiteManifest` を渡す（あるいは consume する）何かを build するときは、boundary
types を import します。これらは setu が emit し dwar が render する、まさにその shapes
です — 参照:
[`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
と
[`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)。

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

types が強制するいくつかのこと、source からそのまま:

- `Page.slug` は site root からの相対 — leading slash なし、`.html` なし。
- `Page.body` は常に MDX string; `mdast` と `headings` は optional。
- `Frontmatter.kind` は `PageKind`（`class` | `module` | `namespace` |
  `mixin` | `interface` | `typedef` | `global` | `index` | `guide` | `source`）。
- `NavNode` は recursive: leaves は `slug` を持ち、branches は `children` を持つ。

Theme contract は
[`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
にあります:

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

## slug rule を使う

setu と dwar はどちらも同じ functions を通じて slugify するので、sidebar link と
それが指す heading anchor が食い違うことは決してありません。
[`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
から検証済みの挙動:

```ts
import { slugifyHeading, slugifyPath, slugifySourcePath } from '@clean-jsdoc-theme/utils';

slugifyHeading('Hello, World!'); // 'hello-world'  (lowercased, punctuation dropped)
slugifyPath(['Foo Bar', 'Baz!']); // 'foo-bar/baz'
slugifySourcePath('src/Foo.js'); // 'src/foo-js'   (extension folded in, not stripped)
slugifySourcePath('lib\\util\\index.ts'); // 'lib/util/index-ts'  (backslashes normalized)
```

`slugifyHeading` は page 上で繰り返される headings を dedupe するための optional な
registry を取ります — 1 つの `Map` を pass して、すべての heading でそれを reuse
します:

```ts
const reg = new Map<string, number>();
slugifyHeading('Options', reg); // 'options'
slugifyHeading('Options', reg); // 'options-1'
slugifyHeading('Options', reg); // 'options-2'
```

sub-directory から serve するには、base path を一度 normalize し、links を `withBase`
を通じて join します（どちらも pure であり、安全に `'/'` へ fail します — 参照:
[`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts)）:

```ts
import { normalizeBasePath, withBase } from '@clean-jsdoc-theme/utils';

const base = normalizeBasePath('https://example.com/docs/api/'); // '/docs/api'
withBase(base, '/guides/intro'); // '/docs/api/guides/intro'
withBase('/', '/guides/intro'); // '/guides/intro'  (unchanged at the root)
```

## options を validate する（そして injectable な fetch を wire する）

`validateThemeOpts` は bridge が build の前に実行する orchestrator です。決して throw
しません: normalized な `value` と、あなたがどう扱うか決める `DiagnosticBag` を返します。
参照:
[`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)。

Google-Fonts の existence check は *唯一の* networked な部分であり、**injected** されます
— `createGoogleFontResolver()` で resolver を build し、それを pass します。これが utils
を browser-safe に保ちます（自分自身で `fetch` を import することは決してありません）。
resolver を省くと、font checks は穏当に skip されます。

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

本物の bridges はこれをまさにこのように wire します。
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
の JSDoc bridge は resolver を build し、`validateThemeOpts` を `unknownKeyPolicy:
'suggest-typos'` で call し（JSDoc 自身の opts は同じ flat namespace を共有します）、
それから bag を log し、`opts.strict` が set されていて *かつ* `diagnostics.hasErrors()`
のときに限り throw します。
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
の TypeDoc plugin は同じことを `unknownKeyPolicy: 'warn-all'` で行います。その options は
共有された flat なものではなく、専用の namespaced block に置かれているからです。

tests や custom runtime のためには、network に hit する代わりに fake な `fetch` を
inject できます — resolver は最小限の `FetchLike` slice だけを必要とします
（`url`、optional な `signal`/`headers`、`{ status }` を返す）:

```ts
const resolver = createGoogleFontResolver({
  fetch: async (url) => ({ status: url.includes('Roboto') ? 200 : 400 }),
});
await resolver('Roboto'); // 'exists'
await resolver('Made Up Font'); // 'missing'  (200 → exists, 400 → missing, else → 'unknown')
```

## build report を print する

files を書き出した後、bridge は `formatBuildReport` で Next.js スタイルの summary を
format します。font check と同様に、node のみに依存する部分（gzip）は **injected** され
utils を node-free に保ちます — `gzipSizer` を pass すると gzip column が現れます。参照:
[`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)。

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

`publish.ts` と `write-site.ts` はどちらもこれをまさにこのように call します — 各 bridge
の `formatBuildReport({ … gzipSizer })` call 周辺の行を参照してください。

## 全体像

- [utils 概要](/packages/utils-overview) — 各 export が何のためにあり、なぜこの package
  が存在するのか。
- [Packages](/#the-packages) — utils が `setu → dwar` pipeline にどう収まるか。
- [setu 概要](/packages/setu-overview) — ここで typed されている `SiteManifest` を
  produce する。
- [dwar 概要](/packages/dwar-overview) — それを `render()` を通じて consume する。
