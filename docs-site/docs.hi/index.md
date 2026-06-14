---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)
[![npm version](https://img.shields.io/npm/v/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![npm downloads](https://img.shields.io/npm/dm/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![GitHub stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)
[![License](https://img.shields.io/npm/l/clean-jsdoc-theme.svg?color=005bff)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)

**clean-jsdoc-theme** JavaScript और TypeScript प्रोजेक्ट्स के लिए एक सम्पूर्ण
documentation suite है — सिर्फ़ JSDoc के output पर रंग-रोगन भर नहीं। इसे किसी
**JSDoc** _या_ **TypeDoc** प्रोजेक्ट पर इंगित करें; यह इन tools का उपयोग पर्दे के
पीछे केवल आपके source comments इकट्ठा करने के लिए करता है। उसके बाद कमान यह ख़ुद
सँभाल लेता है — आपके API का एक structured model बनाकर एक तेज़, आधुनिक static site
render करता है: server-rendered HTML, lazy-hydrate होने वाले interactive islands,
एक built-in fuzzy command palette (`Ctrl K`), full-text search, और first-class
light व dark themes।

यह LLMs के लिए भी बनाया गया है। हर page के साथ यह एक companion `.md` भी निकालता
है, जिसे इस तरह लिखा गया है कि large language models उसे आसानी से पढ़ और समझ सकें —
यानी आपका API reference किसी इंसान जितना ही किसी AI के लिए भी सुपाठ्य है। हर API
page पर one-click actions भी होते हैं जिनसे उस Markdown को copy किया जा सकता है, या
page को सीधे Claude, ChatGPT, या Perplexity में खोला जा सकता है (न चाहें तो ये सभी
opt-out किए जा सकते हैं)।

## आपको क्या मिलता है

### बिना किसी setup के, दो तरह की search

एक `Ctrl K` fuzzy command palette जो titles, descriptions, और पूरे page text में
रैंकिंग करती है — और किसी भी class member तक उसके नाम से सीधे deep-link करती है।
एक ही flag से वैकल्पिक Pagefind full-text index चालू करें।

### एक ही site में prose और API

हाथ से लिखे Markdown guides आपके JSDoc या TypeDoc comments से auto-generate हुए
reference के ठीक बगल में बैठते हैं — एक sidebar, एक search index, एक URL space।
इसे Markdown files के एक folder पर इंगित करें और folder का layout, साथ में थोड़ा-सा
frontmatter, आपका navigation बन जाता है — इस site के prose pages, जिनमें यह page
भी शामिल है, ठीक यही हैं। `{@link}` और `@see` असली cross-page anchors में resolve
होते हैं, और हर member अपनी सटीक source line से link होता है।

### समृद्ध, interactive सामग्री

Tabbed code blocks, copy-to-clipboard, info व warning callouts, sandboxed live
embeds (CodePen और उसके जैसे), और एक Monaco-powered source viewer जो ठीक उसी line
पर खुलता है जिसे आपने link किया था।

### तेज़ और framework-free

lazy-hydrate होने वाले Preact islands के साथ server-rendered HTML — हर island
सिर्फ़ उन्हीं pages पर भेजा जाता है जो उसका उपयोग करते हैं। न तार पर भेजने के लिए
कोई client framework, न संभालने के लिए कोई build config।

### light और dark, बॉक्स से बाहर ही तैयार

OKLCH palette पर first-class light और dark themes — कोई CSS ज़रूरी नहीं। जब चाहें
अपना site name या logo, Google Fonts, sidebar menu, और custom CSS/JS ले आएँ।

### किसी भी भाषा में उपलब्ध

Built-in localization: अपनी locales declare करें और `clean-jsdoc` CLI हर भाषा के
लिए एक static site बनाता है — translated UI, API descriptions, और prose, साथ में
एक header language switcher, per-language fonts, और SEO के लिए `hreflang`। देखें
[Localize your docs](/guides/localize-your-docs)।

### LLMs के लिए बना

हर page machine reading के लिए लिखा गया एक companion `.md` निकालता है, साथ में
opt-out "copy page" और "open in Claude / ChatGPT / Perplexity" actions — ताकि कोई
AI वही reference पढ़े जो आपके users पढ़ते हैं।

### बॉक्स से बाहर ही तैयार एक AI skill

एक downloadable [**skill**](/theme/llm-skill) जो किसी भी coding assistant को
`clean-jsdoc-theme` का विशेषज्ञ बना देती है — अपने agent को उस पर इंगित करें और
आराम करें, जबकि वह पहली ही बार में आपका config सेट करता है, आपके guides लिखता है,
और sidebar सही ढंग से structure करता है। न कोई prompt-engineering, न कोई अटकल।

## पैकेज

`clean-jsdoc-theme` कोई एक अकेला template नहीं है। पर्दे के पीछे यह
single-responsibility packages का एक छोटा समूह है, जो एक one-way `setu → dwar`
pipeline में जुड़े हैं: आपके source comments एक छोर से अंदर जाते हैं और दूसरे छोर से
एक तेज़, static, LLM-friendly site बाहर आती है। चूँकि यह core साझा है, वही टुकड़े
JSDoc और TypeDoc दोनों entry points को चलाते हैं।

ज़्यादातर users इन्हें सीधे कभी नहीं छूते — आप एक entry point install करते हैं, कुछ
[options](/theme/configuration) सेट करते हैं, और बस हो गया। लेकिन हर building block
**npm पर published**, documented, और पुनः-उपयोग-योग्य है।

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (rang के components के साथ) → static site](/assets/build-pipeline.svg)

### मुख्य pipeline

**setu** आपके comments को एक `SiteManifest` में बदलता है; **dwar** उस manifest को
**rang** के Preact components का उपयोग करके HTML/CSS/JS में render करता है;
**utils** में वे साझा types और Zod schemas हैं जो boundary contract को परिभाषित
करते हैं।

| Package | यह क्या करता है | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/utils`](https://www.npmjs.com/package/@clean-jsdoc-theme/utils) | साझा types, Zod schemas, और वह `SiteManifest` contract जिसके विरुद्ध हर दूसरा package बनता है। | [Overview](/packages/utils-overview) · [Examples](/packages/utils-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils) |
| [`@clean-jsdoc-theme/setu`](https://www.npmjs.com/package/@clean-jsdoc-theme/setu) | JSDoc doclets को pages, nav, और cross-resolved links में process करता है — `SiteManifest` निकालता है। कोई I/O नहीं करता। | [Overview](/packages/setu-overview) · [Examples](/packages/setu-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu) |
| [`@clean-jsdoc-theme/rang`](https://www.npmjs.com/package/@clean-jsdoc-theme/rang) | Preact component library, MDX component map, और island registry — वह UI जिसे dwar SSR और hydration के लिए bundle करता है। | [Overview](/packages/rang-overview) · [Examples](/packages/rang-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang) |
| [`@clean-jsdoc-theme/dwar`](https://www.npmjs.com/package/@clean-jsdoc-theme/dwar) | एक `SiteManifest` को in-memory HTML/CSS/JS में render करता है (Preact + MDX + utility CSS + esbuild islands), साथ में एक Pagefind hook। Pure। | [Overview](/packages/dwar-overview) · [Examples](/packages/dwar-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar) |

### Entry points

ये वही हैं जो आप असल में install करते हैं — हर एक आपके docs को उसी `setu → dwar`
core से गुज़ारता है, JSDoc `publish` bridge के ज़रिये और TypeDoc एक registered
output के ज़रिये।

| Package | यह क्या करता है | Getting started | Source |
| --- | --- | --- | --- |
| [`clean-jsdoc-theme`](https://www.npmjs.com/package/clean-jsdoc-theme) | JSDoc template। JSDoc इसके `publish()` bridge को call करता है, जो setu → dwar को orchestrate करके files लिखता है। | [JSDoc Getting Started](/theme/jsdoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme) |
| [`@clean-jsdoc-theme/typedoc`](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc) | TypeDoc plugin। एक `clean-jsdoc-theme` output register करता है जो reflection → setu → dwar चलाता है। | [TypeDoc Getting Started](/theme/typedoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) |

### Localization

अपने docs को कई भाषाओं में ship करें। **aadesh** वह `clean-jsdoc` CLI है जो
extract → translate → build workflow चलाता है; **bhasha** वह pure, browser-safe
i18n core है (catalog, translator, key scheme) जिसे build और UI दोनों साझा करते
हैं। शुरुआत [Localize your docs](/guides/localize-your-docs) से करें।

| Package | यह क्या करता है | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/aadesh`](https://www.npmjs.com/package/@clean-jsdoc-theme/aadesh) | `clean-jsdoc` localization CLI — extract, translate-prompt, validate, और प्रति locale एक site build करता है। | [Overview](/packages/aadesh-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh) |
| [`@clean-jsdoc-theme/bhasha`](https://www.npmjs.com/package/@clean-jsdoc-theme/bhasha) | isomorphic i18n core: chrome catalog, `t` translator, `LanguageProvider`, और API key/hash scheme। | [Overview](/packages/bhasha-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha) |

ये boundaries जान-बूझकर one-way हैं — **setu** कभी dwar या rang को import नहीं
करता, **dwar** सिर्फ़ `SiteManifest` consume करता है, और `render()` pure है — और
यही वह बात है जो दोनों entry points को बिना किसी duplicated logic के एक ही
rendering core साझा करने देती है। प्रोजेक्ट को इस तरह क्यों बाँटा गया है, यह जानने
के लिए [Overview](/theme/overview) देखें; हाथ से लिखे guides को अपने generated
reference के साथ मिलाने के लिए [Combining guides and API](/guides/combine-guides-and-api)
देखें।

## आगे कहाँ जाएँ

- **Getting Started** — इसे install करें और [JSDoc](/theme/jsdoc-getting-started)
  या [TypeDoc](/theme/typedoc-getting-started) को अपने प्रोजेक्ट पर इंगित करें।
- **[API Reference](/api-docs/)** — theme-generated API reference का एक live
  उदाहरण, जो एक छोटे sample module से बना है।
