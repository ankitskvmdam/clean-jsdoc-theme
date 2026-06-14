---
title: सिंहावलोकन
group: Packages/dwar
order: 40
---

# `@clean-jsdoc-theme/dwar`

`@clean-jsdoc-theme/dwar` theme की pipeline का दूसरा आधा हिस्सा संभालता है: यह
**शुद्ध renderer** है। इसे एक `SiteManifest` सौंपिए और यह हर page को HTML में
server-render करता है, interactive islands को bundle करता है, stylesheet और
search index उत्सर्जित करता है, और यह सब in-memory files के रूप में लौटाता है। यह
[setu](/packages/setu-overview) का render-side समकक्ष है, जो manifest उत्पन्न
करता है।

> [!NOTE]
> **नाम क्यों?** *dwar* (द्वार) संस्कृत/हिंदी में **दरवाज़ा / द्वार (door /
> gateway)** के लिए है — वह द्वार जिससे होकर `SiteManifest` गुज़रकर तैयार HTML
> site बन जाता है।

एकमात्र entry point है
[`render(manifest, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts):

```ts
function render(manifest: SiteManifest, opts: RenderOptions): Promise<RenderResult>;
```

> अगर आप सिर्फ़ theme इस्तेमाल करना चाहते हैं, तो आप यह package सीधे कभी install
> नहीं करते — JSDoc और TypeDoc bridges आपके लिए इसे call करते हैं। यह एक internal
> building block है। आप वास्तव में जो install करते हैं उसके लिए
> [Packages](/#the-packages) section देखें, और असली call shape के लिए
> [dwar Examples](/packages/dwar-examples) देखें।

## dwar क्यों मौजूद है

एक documentation build के दो सचमुच अलग काम होते हैं: **symbols को समझना** और
**pixels render करना**। setu पहला करता है; dwar दूसरा करता है। यह विभाजन renderer
को वह एकमात्र जगह बनने देता है जो Preact, MDX, Shiki, esbuild, और HTML shell के
बारे में जानती है — जबकि इस बात से अनजान रहती है कि doclets पर कैसे चला गया या
sidebar कैसे आकार लिया गया। dwar **केवल `SiteManifest`** का उपभोग करता है; यह कभी
doclet database दोबारा नहीं पढ़ता।

`render`
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
ही engine है) निम्नलिखित क्रम में करता है:

- **stylesheet बनाता है** — `theme.tokens` से व्युत्पन्न theme variables साथ ही
  एक pre-compiled Tailwind utility layer, cache-busting के लिए `manifest.buildId`
  से stamped
  ([`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts),
  `buildThemeVariableCss` + inlined `UTILITY_CSS`)।
- **islands को पहले ही bundle करता है** **एक ही split esbuild build** में — हर
  island एक entry point है और `splitting: true` साझा code (Preact, rang की
  registry) को एक अलग `chunk-<hash>.js` में उठा लेता है जिसे हर entry relative
  ESM के ज़रिए import करता है। हर उत्सर्जित file content-hashed है
  (`[name]-[hash].js`)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts))।
- **हर page render करता है** — इसकी MDX body को एक Preact component में compile
  करता है, इसे rang के layout में रचता है, और इसे एक HTML document में serialize
  करता है
  ([`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts),
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx),
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts))।
  Pages सीमित concurrency के साथ render होते हैं (एक worker pool जो
  `min(8, cpus-1)` पर capped है) पर मूल page क्रम में वापस इकट्ठे किए जाते हैं,
  ताकि output deterministic रहे।
- **fuzzy-search index उत्सर्जित करता है** — एक JSON file (प्रति page एक entry
  साथ ही member/method deep-links) जिसे `cmdk` command-palette island runtime पर
  fetch करता है। यह Pagefind के full-text bundle से अलग है।

### Source pages MDX छोड़ देते हैं

वह page जिसका frontmatter `kind: 'source'` है, एक whole-file viewer है, prose
नहीं। dwar इसके लिए MDX compile पूरी तरह छोड़ देता है और इसके बजाय एक
`code-viewer` island mount करता है: SSR `<pre>` file text ले जाता है, जबकि JSON
props payload जानबूझकर code छोड़ देता है (hydration chunk इसे DOM से वापस पढ़ता
है)। Source pages `hidden` हैं, तो वे search index में कुछ योगदान नहीं देते
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
`renderPage` source branch)।

## guarantees (source में सत्यापित)

ये वे दो properties हैं जो dwar को परिभाषित करती हैं, और दोनों code में टिकती हैं।

### `render()` शुद्ध है

dwar disk पर **नहीं** लिखता। `render` memory में `OutputFile`s की एक array allocate
करता है और उन्हें लौटाता है; caller उन्हें persist करता है। render path में कोई
`fs` write, कोई `process.cwd()`, कोई logging नहीं है। module docstring इसे
सीधे-सीधे बताता है: *"`render()` is pure: it returns an in-memory
`RenderResult`."*

दो सावधानी से सीमित अपवाद नियम को सिद्ध करते हैं, और दोनों में से कोई default path
के लिए purity नहीं तोड़ता:

- **`runPagefindAgainstDir`** package में **एकमात्र** filesystem touch है, और यह
  एक *अलग, post-write* function है — `render` से कभी call नहीं होता। यह पहले से
  लिखे HTML की एक directory पर काम करता है और Pagefind bundle को
  `<dir>/pagefind/` के नीचे उत्सर्जित करता है
  ([`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts))।
- **`opts.islandCacheDir`** opt-in है। जब (और केवल जब) कोई bridge इसे प्रदान करता
  है, तब esbuild island bundle एक on-disk cache से पढ़ा/लिखा जाता है; इसे छोड़ दें
  — default — और bundling memory में रहती है। worker pool का आकार तय करने के लिए
  `os.cpus()` पढ़ना स्पष्ट रूप से contract *नहीं* तोड़ने वाला बताया गया है (वह
  कोई fs/cwd/logging के बारे में है)
  ([`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts),
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts) options)।

### `render()` लचीला है

एक भी page जो compile में विफल होता है (जैसे unparseable MDX) build को **रद्द
नहीं** करता। हर page एक `try/catch` के अंदर render होता है: विफलता पर page छोड़
दिया जाता है और `result.errors` में एक `{ slug, message }` entry के रूप में
capture किया जाता है, और बाक़ी site फिर भी render होती है। त्रुटि की *रिपोर्ट* की
जाती है, कभी *throw* नहीं की जाती — bridges build report के बाद छोड़े गए pages को
एक warning के रूप में log करते हैं
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts),
`task` closure;
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
उन्हें surface करता है)।

## `render()` क्या उत्सर्जित करता है

सब कुछ `result.files` के अंदर वापस आता है (एक `OutputFile[]`, हर एक
`{ path, contents }` जिसमें destination root के सापेक्ष एक forward-slash path
होता है):

- **प्रति-page HTML** — `<slug>/index.html` (root/empty slug → `index.html`),
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  से पूरा document shell।
- **एक सह-स्थित साथी `.md`** हर content page के लिए — page की MDX body
  **अक्षरशः** लिखी गई (`<slug>/index.md`), ताकि LLMs और copy-page button मौजूदा
  page के लिए Markdown source fetch कर सकें। Source-viewer pages की कोई body नहीं
  होती और वे कोई उत्सर्जित नहीं करते।
- **एक stylesheet** — theme-variable + utility CSS, build-id से stamped।
- **fuzzy-search index** — `_assets/search-index.<buildId>.json`, page entries
  साथ ही member deep-links।
- **island bundles** — content-hashed entry chunks साथ ही साझा chunk,
  `_islands/` के नीचे।
- **एक प्रति-page JSON props payload** — हर HTML document में
  `<script type="application/json" data-island-props>` के रूप में embedded, जिसे
  inline island loader hydration समय पढ़ता है
  ([`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts),
  `buildIslandsPropsPayload`)।

`files` के साथ-साथ, `RenderResult` `search` ले जाता है (प्रति-page entries, किसी
भी caller के लिए जो उन्हें चाहता है), एक वैकल्पिक `errors` array (केवल तब मौजूद जब
कोई page विफल हुआ हो), और एक `stats` block (`pageCount`, `assetCount`,
`cssBytes`, `jsBytes`, `durationMs`)
([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))।

> जानबूझकर **कोई `embedSearchIndex` flag नहीं** है। Full-text search अलग
> `runPagefindAgainstDir` post-write step है — renderer कभी किसी Pagefind bundle
> को inline नहीं करता।

## Dependencies

dwar उन तीन sibling packages पर निर्भर है जिनके downstream यह बैठता है, साथ ही
render toolchain पर
([`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/package.json)):

- **`@clean-jsdoc-theme/utils`** — boundary types (`SiteManifest`,
  `RenderOptions`, `RenderResult`, `OutputFile`, …); देखें
  [utils Overview](/packages/utils-overview)।
- **`@clean-jsdoc-theme/setu`** — manifest generator (smoke script द्वारा
  उपयोग); देखें [setu Overview](/packages/setu-overview)।
- **`@clean-jsdoc-theme/rang`** — वे Preact components और island registry जिन्हें
  dwar bundle और रचता है; देखें [rang Overview](/packages/rang-overview)।
- **`preact` / `preact-render-to-string`** SSR के लिए, **`@mdx-js/mdx`** +
  **`@shikijs/rehype`** / **`shiki`** MDX compile + highlighting के लिए,
  **`esbuild`** island bundle के लिए, और **`pagefind`** (वैकल्पिक) post-write
  index के लिए।

## source पढ़ें

maintainer चाहता है कि आपको code की ओर भेजा जाए — यहाँ से शुरू करें:

- **Package directory:**
  [packages/dwar](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar)
  ·
  [packages/dwar/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar/src)
- **entry point + purity/resilience logic:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
  (`render`, प्रति-page `try/catch`, source-page branch)
- **option + result types:**
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  (`RenderOptions`, `RenderResult`, `OutputFile`, `RenderError`)
- **HTML shell:**
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  (`renderHtmlDocument`, `htmlPathFor`, `mdPathFor`, props payload)
- **layout seam:**
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  (`SsrLayout`, rang के slots + island markers को रचते हुए)
- **MDX compile:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts)
  (`compileMdxToComponent`, `collectUsedLangs`)
- **island bundle:**
  [`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  (split esbuild build) और
  [`islands-loader.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-loader.ts)
- **CSS pipeline:**
  [`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts)
- **(एकमात्र) filesystem touch:**
  [`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)
  (`runPagefindAgainstDir`)
- **runnable example:**
  [`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)

## आगे

- [dwar Examples](/packages/dwar-examples) — runnable smoke script और उन दो
  bridges से असली call shape।
- [setu Overview](/packages/setu-overview) — जहाँ से dwar जिस `SiteManifest` का
  उपभोग करता है वह आता है।
- [rang Overview](/packages/rang-overview) — वे components और islands जिन्हें
  dwar bundle करता है।
- [Configuration](/theme/configuration) — वे `theme` options जो एक render चलाते
  हैं।
