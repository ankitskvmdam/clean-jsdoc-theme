---
title: सिंहावलोकन
group: Packages/utils
order: 10
---

# `@clean-jsdoc-theme/utils`

`@clean-jsdoc-theme/utils` वह साझा contract है जिसे pipeline का हर दूसरा package
import करता है। यह **setu और dwar के बीच की type boundary**, वे **slug rules** जो
दोनों पक्ष इस्तेमाल करते हैं ताकि nav links और heading anchors हमेशा मेल खाएँ, और
वह शुद्ध **opts-validation + build-report** logic परिभाषित करता है जिसे
entry-point bridges चलाते हैं।

इसमें कोई rendering और कोई I/O नहीं है — सिर्फ़ interfaces, Zod schemas, और कुछ
छोटे शुद्ध functions जिनके इर्द-गिर्द बाक़ी system बना है।

> अगर आप सिर्फ़ theme इस्तेमाल करना चाहते हैं, तो आप यह package कभी install नहीं
> करते। यह एक internal building block है। आप वास्तव में जो हिस्से install करते हैं
> उनके लिए [Packages](/#the-packages) section देखें, और options के लिए
> [Configuration](/theme/configuration) देखें।

## यह अलग package क्यों है

पूरी pipeline जानबूझकर one-way है — setu doclets को एक `SiteManifest` में बदलता
है, dwar उस manifest को render करता है — और दोनों हिस्सों के बीच कभी कोई छुपा हुआ
coupling नहीं बढ़ना चाहिए। boundary types को उनके अपने package में खींचने से
project को दो चीज़ें मिलती हैं:

- **boundary के लिए सत्य का एक ही स्रोत।** setu एक `SiteManifest` उत्सर्जित करता
  है, dwar *उसी* `SiteManifest` type का उपभोग करता है, और कोई भी दूसरे को import
  नहीं करता। यह आकार यहाँ एक ही बार परिभाषित होता है ताकि build पक्ष और render पक्ष
  कभी अलग न हों। इसे आप boundary barrel,
  [`site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  में देख सकते हैं, जिसका अपना doc comment इसे "the boundary contract between setu
  (build) and dwar (render)" कहता है।
- **Browser-safe, इसलिए rang भी इसे import कर सकता है।** Preact component library
  (rang) browser में चलती है, इसलिए जो contract वह साझा करती है उसे node-free होना
  चाहिए। यहाँ की slug rules, base-path helpers, diagnostics model, और build-report
  formatter केवल web-platform globals (`URL`, `TextEncoder`, `fetch`,
  `AbortController`) का उपयोग करते हैं — कभी `fs`, `Buffer`, या `node:*` का नहीं।
  एकमात्र networked dependency (Google Fonts के अस्तित्व की जाँच) और एकमात्र
  node-only dependency (gzip sizing) को import करने के बजाय caller द्वारा
  **inject** किया जाता है, और यही package को browser में importable रखता है।

शीर्ष barrel,
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts),
सब कुछ re-export करता है, और `package.json` एक ही entry point उजागर करता है — तो
हर consumer `@clean-jsdoc-theme/utils` से import करता है (कोई subpath exports
नहीं हैं)।

## अंदर क्या है

package दो surfaces में बँटता है: `site/` contracts और `config/` logic, साथ ही
JSDoc doclet schema।

### `site/` — setu ↔ dwar contract

boundary objects और वे rules जिन्हें दोनों पक्षों को साझा करना होता है। सत्यापित
exports में शामिल हैं:

- **`SiteManifest`, `Page`, `NavNode`, `SearchEntry`** — जो setu, dwar को सौंपता
  है: pages, nav tree, search index, और cache busting के लिए एक `buildId`।
  manifest जानबूझकर self-contained है: dwar को कभी doclet database दोबारा नहीं
  पढ़ना चाहिए।
  ([`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts),
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`Frontmatter`, `PageKind`, `Heading`** — प्रति-page metadata, page kind
  (`class`, `module`, `guide`, `source`, …) जो layout चलाता है, और पहले से
  निकाली गई headings जिन्हें TOC island render करता है।
  ([`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`RenderOptions`, `RenderResult`, `OutputFile`, `RenderError`** — `dwar.render`
  का input और output। `render()` शुद्ध है और files को memory में लौटाता है;
  doc comment बताता है कि जानबूझकर कोई `embedSearchIndex` flag नहीं है।
  ([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))
- **`ThemeConfig`, `ThemeTokens`, `ThemeColors`, `ComponentOverrides`** — theme
  contract: color tokens, fonts, Shiki themes, component slot overrides, base
  path, copy-page और prev/next config, custom CSS/JS।
  ([`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts))
- **`SiteName`, `SiteLogo`** साथ ही helpers `siteNameText()` और
  `resolveSiteLogo()` — plain-text-या-logo-set वाली site identity।
  ([`site-name.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/site-name.ts))
- **`IslandName`, `IslandPropsMap`** — interactive islands की registry
  (`sidebar`, `toc`, `cmdk`, `copy-page`, …) और हर एक के लिए type-safe prop bag,
  जो server render और hydration के बीच साझा होता है।
  ([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts))
- **`slugifyHeading()`, `slugifyPath()`, `slugifySourcePath()`** — GitHub-style
  slug rules। setu (sidebar / TOC generation) और dwar (rendered anchor IDs) दोनों
  यहाँ से import करते हैं ताकि anchors और links हमेशा मेल खाएँ; यह file इसे
  "Risk R4" को संबोधित करने वाला बताती है।
  ([`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts))
- **`normalizeBasePath()`, `withBase()`** — site को एक sub-directory से serve
  करने के लिए शुद्ध, browser-safe, fail-safe helpers।
  ([`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts))

### `config/` — शुद्ध opts validation + build report

वह logic जिसे entry-point bridges एक build से पहले और बाद में चलाते हैं:

- **`validateThemeOpts()`** — orchestrator। एक raw opts object लेता है, `siteName`
  और `fonts` validators तथा एक unknown-key policy को एक ही `DiagnosticBag` में
  चलाता है, और normalized मान लौटाता है। कभी throw नहीं करता — strict-mode लागू
  करना caller का काम है, `diagnostics.hasErrors()` के ज़रिए।
  ([`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts))
- **`DiagnosticBag`, `Diagnostic`, `formatDiagnostics()`** — reporting की रीढ़:
  एक संरचित, level-tagged (`error` / `warning` / `info`) finding model जो शुद्ध
  और node-free है।
  ([`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts))
- **`createGoogleFontResolver()`, `FontResolver`, `FontExistence`,
  `FetchLike`** — वह *injection* pattern जो utils को browser-safe रखता है।
  एकमात्र networked जाँच (क्या यह Google Font मौजूद है?) एक injected `fetch` के
  इर्द-गिर्द बनी है और **fail-open** है: कुछ भी अस्पष्ट होने पर `'unknown'` में
  resolve होता है ताकि कोई offline build कभी न टूटे।
  ([`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts))
- **`formatBuildReport()`** — Next.js-style build summary। Byte sizes
  `TextEncoder` से आते हैं (कभी `Buffer` से नहीं); gzip sizing एक *injected*
  `gzipSizer` है, फिर से ताकि utils node-free रहे।
  ([`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts))
- **Zod schemas** — `THEME_OPT_KEYS`, `SiteNameSchema`, `FontsSchema`,
  `MenuSchema`, `CopyPageConfigSchema`, और इनके साथी — पहचानी गई theme-option
  surface, Zod के रूप में व्यक्त ताकि failures एक संरचित `path` + `message` साथ
  लाएँ।
  ([`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts))

### doclet schema

`doclet-schema.ts` (`TDoclet` और साथी) और `salty.ts`
(`TJSDocSaltyCollection`) उन JSDoc-side types को ले जाते हैं जिन्हें setu पढ़ता
है। इन्हें भी शीर्ष barrel से re-export किया जाता है, तो setu की doclet processing
इन्हें उसी package से import करती है।

## injection pattern कैसे काम करता है

यही वह विवरण है जो एक config package को browser-safe रहने देता है। utils कभी
`fetch` या `zlib` import नहीं करता; caller उन्हें pass करता है:

- `validateThemeOpts({ … fontResolver })` एक resolver लेता है जिसे bridge
  `createGoogleFontResolver()` से बनाता है। इसके बिना, font existence जाँचें
  सहजता से छोड़ दी जाती हैं और build आगे बढ़ता है।
- `formatBuildReport({ … gzipSizer })` gzip function लेता है। gzip column तभी
  दिखता है जब कोई sizer दिया जाता है; bridge
  `(b) => zlib.gzipSync(b).length` pass करता है।

`google-fonts.ts` और `report.ts` दोनों इसे अपने module doc comments में बताते
हैं: networked / node-only dependency "is never imported, only the optional
[resolver/sizer] injected by the caller."

## source पढ़ें

maintainer चाहता है कि आपको code की ओर भेजा जाए — यहाँ से शुरू करें:

- **Package directory:**
  [packages/utils](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils)
  ·
  [packages/utils/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils/src)
- **Barrels:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
  ·
  [`src/site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  (boundary barrel) ·
  [`src/config/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/index.ts)
- **contracts:**
  [`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
  ·
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)
  ·
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  ·
  [`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
  ·
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts)
  ·
  [`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
- **config logic:**
  [`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)
  ·
  [`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts)
  ·
  [`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)
  ·
  [`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts)
  ·
  [`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts)

## आगे

- [utils Examples](/packages/utils-examples) — इन types का उपयोग करते ठोस snippets।
- [setu Overview](/packages/setu-overview) — वह package जो `SiteManifest`
  *उत्पन्न* करता है।
- [dwar Overview](/packages/dwar-overview) — वह package जो इसका *उपभोग* करता है।
