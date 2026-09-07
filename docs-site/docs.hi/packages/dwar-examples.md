---
title: उदाहरण
group: Packages/dwar
order: 41
---

# dwar Examples

dwar **internal** है। आप एक सामान्य docs build में `render` को call नहीं करते —
JSDoc और TypeDoc bridges आपके लिए इसे call करते हैं। आप इसकी ओर सीधे तभी बढ़ते हैं
जब आप एक *custom bridge* बना रहे हों, या जब आप renderer को अलगाव में देखना चाहते
हों।

सबसे अच्छा शुरुआती बिंदु package का अपना runnable example है: **smoke script**। यह
पूरे `dwar → disk` path को हाथ से लिखे एक manifest के विरुद्ध exercise करता है, और
चूँकि यह असली code है जो चलता है, यह इस doc का सबसे ईमानदार example है।

अगर आप सिर्फ़ theme को configure करना चाहते हैं, तो इसके बजाय
[Configuration](/theme/configuration) देखें।

## Smoke script चलाएँ

```bash
pnpm --filter @clean-jsdoc-theme/dwar run smoke
```

[`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
हाथ से एक छोटा `SiteManifest` बनाता है — एक index page, headings और code fences
वाला एक guide, एक API page, और एक `kind: 'source'` viewer — उसे dwar के `render()`
को सौंपता है, और लौटाई गई files को `packages/dwar/preview/` में **लिखता** है। यह
visual sanity-checking के लिए मौजूद है।

manifest जानबूझकर हाथ से लिखा गया है: dwar को setu पर निर्भर नहीं होना चाहिए
(setu→dwar boundary एक-तरफ़ा है)। पूरा `setu → dwar → disk` path
[`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic)
द्वारा end-to-end exercise होता है।

flow, end to end, है: **manifest in → files out → आप उन्हें लिखते हैं → preview/**।

## `render(manifest, opts)` call

`render` `SiteManifest` और एक `RenderOptions` लेता है। `RenderOptions` का एकमात्र
आवश्यक field `theme` है; बाक़ी सब optional है। smoke script minimal form इस्तेमाल
करता है
([`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)):

```ts
import { render } from '@clean-jsdoc-theme/dwar';
import type { ThemeConfig } from '@clean-jsdoc-theme/dwar';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';

const theme: ThemeConfig = {
  tokens: {
    colors: { bg: '#ffffff', bgMuted: '#f3f4f6', fg: '#0f172a', /* … */ border: '#e5e7eb' },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

const manifest: SiteManifest = {
  buildId: 'smoke',
  pkg: { name: 'clean-jsdoc-theme', version: '…' },
  nav: [{ label: 'Home', slug: 'index' }],
  pages: [{ slug: 'index', frontmatter: { title: 'Home', kind: 'index' }, body: 'Hello.\n' }],
};

const result = await render(manifest, { theme });
//                              ^ only `theme` is required
```

### dwar जो `RenderOptions` fields पढ़ता है

नीचे का हर field
[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
में `RenderOptions` पर है — कुछ भी आविष्कृत नहीं है।

| Field | आवश्यक | यह क्या करता है |
| --- | --- | --- |
| `theme` | **हाँ** | `ThemeConfig` — `tokens` (colors, fonts, shiki, `siteName`, …), `basePath`, और optional `copyPage` / `pageNav` / `aiPrompt` / `customCss(File)` / `customJs(File)` knobs जिन्हें render पढ़ता है। |
| `destination` | नहीं | destination directory। **केवल** path resolution context के लिए इस्तेमाल होती है — dwar वहाँ ख़ुद कभी नहीं लिखता। |
| `islandCacheDir` | नहीं | esbuild island bundle के लिए opt-in on-disk cache। इसे देने से एक warm rebuild ~0.4s bundle step skip कर सकता है; इसे छोड़ने से `render()` शुद्ध रहता है। bridges `<project>/node_modules/.cache/clean-jsdoc-theme` pass करते हैं। |
| `inlineSvgs` | नहीं | एक doc-image `src` से उस SVG की raw markup का Map, ताकि rang theme-aware SVGs को `<img>` करने के बजाय inline करे। bridge files पढ़ता है; `render()` बस उन्हें look up करता है। |

bridges एक fuller `theme` बनाते हैं (palette overrides, fonts, `copyPage`,
`pageNav`, custom CSS/JS hrefs) और चारों options pass करते हैं, पर contract वही
है: `theme` आवश्यक है, बाक़ी वह है जो bridge को मिला।

## `RenderResult` में क्या होता है, और एक bridge इसे कैसे persist करता है

`render` एक `RenderResult` में resolve होता है
([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)):

```ts
interface RenderResult {
  files: OutputFile[];        // { path, contents } — everything to write
  search?: SearchEntry[];     // per-page entries (the JSON index is already in `files`)
  errors?: RenderError[];     // { slug, message } — pages skipped, present only on failure
  stats: {
    pageCount: number;        // pages rendered successfully (excludes errors)
    assetCount: number;       // non-HTML files (CSS + JS chunks + search index)
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}
```

व्यवहार में purity contract: **`render()` files को memory में लौटाता है; आप उन्हें
लिखते हैं।** smoke script ठीक यही करता है — एक plain write loop
([`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)):

```ts
const result = await render(manifest, { theme });

// Fresh output dir, then write every OutputFile (string or Uint8Array).
await rm(previewDir, { recursive: true, force: true });
await mkdir(previewDir, { recursive: true });
for (const file of result.files) {
  const out = resolve(previewDir, file.path);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents));
}
```

असली bridges एक-समान shape अपनाते हैं। JSDoc bridge
([`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts))
`render` को call करता है, फिर dwar की files को उन assets के साथ concatenate करता
है जिन्हें *उसने* copy किया (logos, custom CSS/JS, doc images), और उन सबको लिखता
है:

```ts
const result = await render(manifest, {
  theme: { ...resolveTheme(opts, siteName, fonts, basePath), ...customAssets.theme },
  destination: absoluteDestination,
  islandCacheDir,
  inlineSvgs,
});

const outputFiles = [...result.files, ...logoFiles, ...customAssets.files, ...docImageFiles];
await writeOutputFiles(absoluteDestination, outputFiles);

// Render failures are reported, never fatal.
if (result.errors && result.errors.length > 0) {
  for (const e of result.errors) console.warn(`  - ${e.slug}: ${e.message}`);
}
```

TypeDoc bridge
([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
ESM में वही चीज़ करता है: `render(manifest, { theme, destination, islandCacheDir })`,
फिर `writeOutputFiles`। दोनों `errors` array को एक warning मानते हैं।

> write loop में श्रम-विभाजन पर ध्यान दें: **dwar की `result.files`** HTML, साथी
> `.md`, stylesheet, island chunks, और fuzzy-search JSON हैं। **logos, custom
> CSS/JS, और doc images** *bridge* (I/O layer) द्वारा copy किए जाते हैं और
> concatenate किए जाते हैं — इसीलिए `render()` शुद्ध रहता है और बस परिणामी hrefs
> को link करता है।

## Contract, पुनः कथित

- `render(manifest, opts)` **शुद्ध** है — यह files को memory में allocate करता है
  और उन्हें लौटाता है। यह कभी disk पर नहीं लिखता। एकमात्र अपवाद opt-in
  island-bundle cache (`islandCacheDir`) है; उसे छोड़ दें और `render()` disk को
  बिलकुल नहीं छूता।
- **आप** `result.files` को destination में लिखते हैं।
- search को किसी post-write step की ज़रूरत नहीं: fuzzy index पहले से ही
  `result.files` में एक file है (`_assets/search-index.<buildId>.json`), और `cmdk`
  island उसे runtime पर fetch करता है।

## Read the source

ये canonical, working usages हैं — ऊपर के किसी snippet पर भरोसा करने के बजाय इन्हें
पढ़ें:

- **The runnable example:**
  [`packages/dwar/scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
  — हाथ से लिखा manifest → `render` → write loop।
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — `render` call, combined write, और error handling।
- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — वही path, पूरी तरह ESM।
- **The option + result types:**
  [`packages/utils/src/site/render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
- **The entry point:**
  [`packages/dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)

## आगे

- [dwar सिंहावलोकन](/packages/dwar-overview) — dwar क्यों मौजूद है, purity और
  resilience guarantees, और `render()` क्या emit करता है।
- [setu सिंहावलोकन](/packages/setu-overview) — `SiteManifest` कहाँ से आता है।
- [rang सिंहावलोकन](/packages/rang-overview) — वे components और islands जिन्हें dwar
  page में bundle करता है।
