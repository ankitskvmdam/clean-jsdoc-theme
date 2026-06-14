---
title: उदाहरण
group: Packages/utils
order: 11
---

# `@clean-jsdoc-theme/utils` का उपयोग

> **पहले ख़ुद से ईमानदार रहें:** `@clean-jsdoc-theme/utils` एक internal building
> block है। आप इसे लगभग कभी अकेले install नहीं करते। आप इसकी ओर तब बढ़ते हैं जब आप
> एक **custom bridge** (अपना ख़ुद का entry point जो `setu → dwar` चलाता है), एक
> **tool** जो किसी `SiteManifest` को produce या inspect करता है, या एक
> **component override** लिख रहे हों जिसे boundary types चाहिए। अगर आप सिर्फ़ docs
> चाहते हैं, तो इसके बजाय एक [entry point](/#the-packages) install करें और
> [options](/theme/configuration) set करें।

सब कुछ एकमात्र package entry से export होता है — कोई subpath exports नहीं हैं
(`package.json` केवल `.` expose करता है), इसलिए सभी imports ऐसे दिखते हैं:

```ts
import { slugifyHeading, validateThemeOpts } from '@clean-jsdoc-theme/utils';
import type { SiteManifest, Page, ThemeConfig } from '@clean-jsdoc-theme/utils';
```

## एक contract type import करें

जब आप कुछ ऐसा बनाते हैं जो dwar को एक `SiteManifest` सौंपता है (या किसी का उपभोग
करता है), तो boundary types import करें। ये ठीक वही shapes हैं जिन्हें setu emit
करता है और dwar render करता है — देखें
[`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
और
[`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)।

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

कुछ चीज़ें जिन्हें types लागू करती हैं, सीधे source से:

- `Page.slug` site root के सापेक्ष है — कोई leading slash नहीं, कोई `.html` नहीं।
- `Page.body` हमेशा एक MDX string होती है; `mdast` और `headings` optional हैं।
- `Frontmatter.kind` एक `PageKind` है (`class` | `module` | `namespace` |
  `mixin` | `interface` | `typedef` | `global` | `index` | `guide` | `source`)।
- `NavNode` recursive है: leaves एक `slug` रखते हैं, branches `children` रखते हैं।

Theme contract
[`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
में रहता है:

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

## एक slug rule इस्तेमाल करें

setu और dwar दोनों एक ही functions के ज़रिए slugify करते हैं ताकि एक sidebar link
और वह heading anchor जिसकी ओर वह इशारा करता है कभी असहमत न हों।
[`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
से सत्यापित व्यवहार:

```ts
import { slugifyHeading, slugifyPath, slugifySourcePath } from '@clean-jsdoc-theme/utils';

slugifyHeading('Hello, World!'); // 'hello-world'  (lowercased, punctuation dropped)
slugifyPath(['Foo Bar', 'Baz!']); // 'foo-bar/baz'
slugifySourcePath('src/Foo.js'); // 'src/foo-js'   (extension folded in, not stripped)
slugifySourcePath('lib\\util\\index.ts'); // 'lib/util/index-ts'  (backslashes normalized)
```

`slugifyHeading` एक page पर दोहराए गए headings को dedupe करने के लिए एक optional
registry लेता है — एक `Map` pass करें और उसे हर heading में reuse करें:

```ts
const reg = new Map<string, number>();
slugifyHeading('Options', reg); // 'options'
slugifyHeading('Options', reg); // 'options-1'
slugifyHeading('Options', reg); // 'options-2'
```

किसी sub-directory से serve करने के लिए, base path को एक बार normalize करें और
links को `withBase` के ज़रिए join करें (दोनों शुद्ध हैं और सुरक्षित रूप से `'/'`
पर fail करते हैं — देखें
[`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts)):

```ts
import { normalizeBasePath, withBase } from '@clean-jsdoc-theme/utils';

const base = normalizeBasePath('https://example.com/docs/api/'); // '/docs/api'
withBase(base, '/guides/intro'); // '/docs/api/guides/intro'
withBase('/', '/guides/intro'); // '/guides/intro'  (unchanged at the root)
```

## Options validate करें (और injectable fetch को wire करें)

`validateThemeOpts` वह orchestrator है जिसे एक bridge build से पहले चलाता है। यह
कभी throw नहीं करता: यह normalized `value` और एक `DiagnosticBag` लौटाता है जिसके
साथ आप तय करते हैं कि क्या करना है। देखें
[`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)।

Google-Fonts existence check *एकमात्र* networked हिस्सा है, और यह **injected** है
— आप `createGoogleFontResolver()` के साथ एक resolver बनाते हैं और उसे pass करते
हैं। यही utils को browser-safe रखता है (यह कभी ख़ुद `fetch` import नहीं करता)।
resolver को छोड़ दें तो font checks शालीनता से skip हो जाते हैं।

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

असली bridges इसे ठीक इसी तरह wire करते हैं।
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
में JSDoc bridge resolver बनाता है, `validateThemeOpts` को `unknownKeyPolicy:
'suggest-typos'` के साथ call करता है (JSDoc के अपने opts वही flat namespace साझा
करते हैं), फिर bag को log करता है और केवल तभी throw करता है जब `opts.strict` set
हो *और* `diagnostics.hasErrors()` हो।
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
में TypeDoc plugin वही करता है पर `unknownKeyPolicy: 'warn-all'` के साथ, क्योंकि
उसके options एक साझा flat block के बजाय एक dedicated namespaced block में रहते
हैं।

Tests या किसी custom runtime के लिए आप network पर hit करने के बजाय एक fake `fetch`
inject कर सकते हैं — resolver को केवल minimal `FetchLike` slice चाहिए
(`url`, optional `signal`/`headers`, returns `{ status }`):

```ts
const resolver = createGoogleFontResolver({
  fetch: async (url) => ({ status: url.includes('Roboto') ? 200 : 400 }),
});
await resolver('Roboto'); // 'exists'
await resolver('Made Up Font'); // 'missing'  (200 → exists, 400 → missing, else → 'unknown')
```

## एक build report print करें

Files लिखने के बाद, bridge `formatBuildReport` के साथ एक Next.js-शैली का summary
format करता है। font check की तरह, node-only dependency (gzip) **injected** है
ताकि utils node-free रहे — एक `gzipSizer` pass करें और gzip column प्रकट होता है।
देखें
[`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)।

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

`publish.ts` और `write-site.ts` दोनों इसे ठीक इसी तरह call करते हैं — हर bridge
में `formatBuildReport({ … gzipSizer })` calls के आसपास की lines देखें।

## बड़ी तस्वीर

- [utils सिंहावलोकन](/packages/utils-overview) — हर export किसलिए है और यह package
  क्यों मौजूद है।
- [Packages](/#the-packages) — utils `setu → dwar` pipeline में कैसे फिट होता है।
- [setu सिंहावलोकन](/packages/setu-overview) — वह `SiteManifest` produce करता है जिसे
  आप यहाँ typed देखते हैं।
- [dwar सिंहावलोकन](/packages/dwar-overview) — इसे `render()` के ज़रिए उपभोग करता है।
