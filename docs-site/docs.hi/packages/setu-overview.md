---
title: सिंहावलोकन
group: Packages/setu
order: 20
---

# `@clean-jsdoc-theme/setu`

`@clean-jsdoc-theme/setu` theme की pipeline का पहला आधा हिस्सा संभालता है: यह एक
JSDoc/TypeDoc **doclet collection** को एक संरचित **`SiteManifest`** में बदलता है
— pages, एक nav tree, और वह link resolution जो उन्हें आपस में जोड़ती है। यह
[dwar](/packages/dwar-overview) का build-side समकक्ष है, जो manifest को HTML में
render करता है।

> [!NOTE]
> **नाम क्यों?** *setu* (सेतु) संस्कृत में **पुल (bridge)** के लिए है — उपयुक्त
> है, क्योंकि यह package आपके कच्चे doclets को उस संरचित `SiteManifest` तक जोड़ता
> है जिसका renderer उपभोग करता है।

एकमात्र entry point है
[`generateSite(collection, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts):

```ts
function generateSite(collection: unknown, opts?: GenerateSiteOptions): SiteManifest;
```

> अगर आप सिर्फ़ theme इस्तेमाल करना चाहते हैं, तो आप यह package सीधे कभी install
> नहीं करते — JSDoc और TypeDoc bridges आपके लिए इसे call करते हैं। यह एक internal
> building block है। आप वास्तव में जो install करते हैं उसके लिए
> [Packages](/#the-packages) section देखें, और call shape के लिए
> [setu Examples](/packages/setu-examples) देखें।

## setu क्यों मौजूद है

एक documentation build के दो सचमुच अलग काम होते हैं: **symbols को समझना**
(doclets पर चलना, members को bucket करना, cross-references resolve करना, sidebar
को आकार देना) और **pixels render करना** (MDX compile, islands, HTML, search
index)। setu पहला काम है, अलग किया गया ताकि किसी renderer के बिना ही उस पर तर्क
किया और परीक्षण किया जा सके।

एक salty doclet collection मिलने पर, `generateSite`
([`generate-site.ts` ही engine है](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))
यह उत्पन्न करता है:

- **हर container symbol के लिए एक page।** container kinds —
  `module`, `namespace`, `class`, `interface`, `mixin`, `typedef` — हर एक को एक
  स्वतंत्र page मिलता है, जो उसी निश्चित क्रम में गिने जाते हैं (देखें
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  में `CONTAINER_KINDS`)। Typedefs ठीक उसी `getContainerView` /
  `renderContainerPage` path से गुज़रते हैं जिससे classes गुज़रती हैं।
- **एक समेकित "Globals" page।** हर global-scope symbol जिसे अपना page नहीं मिलता
  (functions, members, constants, enums, events) एक synthetic container पर एक
  member section के रूप में render किया जाता है
  ([`buildGlobalsView`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।
- **Prose / guide pages** तीन free-form स्रोतों से: project README (home page),
  एक docs directory, और JSDoc tutorials
  ([`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts))।
- **Read-only source-viewer pages** साथ ही हर member से वापस जाने वाले
  `Source: file:line` links, जब bridge project की source files प्रदान करता है
  ([`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts))।
- **nav tree** — sidebar — kind द्वारा या एक authored `@category` द्वारा sections
  में समूहित, `sectionOrder` / `@order` द्वारा क्रमबद्ध
  ([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।
- **Resolved cross-references** हर `{@link}` / `@see` / `@tutorial` के लिए
  ([`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts))।

## contract boundaries

setu जानबूझकर बाड़ में घिरा है। ये वे boundaries हैं जिन्हें आप source में सत्यापित
कर सकते हैं, और यही build पक्ष को render पक्ष से स्वतंत्र रखती हैं।

- **यह केवल Markdown/MDX उत्सर्जित करता है — कोई HTML नहीं।** हर page body
  [`toMdx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  के ज़रिए serialize होती है, जो एक mdast tree को MDX-safe Markdown में बदलता है।
  यह एक custom link serializer भी देता है जो *हमेशा* resource रूप `[label](url)`
  उत्सर्जित करता है और कभी autolink रूप `<url>` नहीं, क्योंकि एक नंगे `<url>` को
  JSX के रूप में parse कर लिया जाएगा और dwar के MDX compile को रोक देगा। setu कभी
  अंतिम HTML उत्पन्न नहीं करता; वह dwar का काम है।
- **यह कोई I/O नहीं करता।** setu कभी filesystem को नहीं छूता। README एक string के
  रूप में आता है, docs और source files bridge द्वारा पहले से पढ़े आते हैं,
  tutorials एक normalized tree के रूप में आते हैं। `generate-site.ts` और
  `source-view.ts` दोनों अपने comments में बताते हैं कि module शुद्ध है — यह केवल
  उन inputs को रूपांतरित करता है जो इसे दिए जाते हैं (कोई `fs`, कोई `cwd` नहीं)।
- **यह केवल `utils` पर निर्भर है।**
  [`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/package.json)
  में एकमात्र workspace dependency `@clean-jsdoc-theme/utils` है (साझा boundary
  contract — `SiteManifest`, `Page`, `NavNode`, slug rules)। बाक़ी mdast/hast/markdown
  processing libraries हैं। setu कभी **dwar** या **rang** को import नहीं करता;
  dependency तीर केवल एक दिशा में इंगित करता है।

## दो-pass link build

Pages एक-दूसरे से link करते हैं, और एक page उस symbol को संदर्भित कर सकता है जो
उसके *बाद* गिना गया हो। इसलिए `generateSite` passes में build करता है
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts),
[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)):

1. **specs एकत्र करें (एक dedup pass)।** यह `CONTAINER_KINDS` को क्रम में दोहराता
   है, हर container का view + slug बनाता है, और किसी भी बाद वाले container को जो
   slug पर टकराता है, गिराने के बजाय *merge* कर देता है — ताकि किसी भी doclet के
   members या relations न खोएँ। dedup यहीं एक जगह होता है, तो registry और rendered
   pages कभी अलग नहीं हो सकते।
2. **link registry को भरें, फिर resolver बनाएँ।** registry *ठीक बचे हुए spec set*
   से भरी जाती है और किसी भी page body के render होने से पहले पूरी तरह भर जाती है
   — ताकि forward references resolve हो जाएँ। resolver (`makeLinkResolver`) exact
   longnames, दोनों दिशाओं में एक `module:`-prefix fallback, और एक unique
   short-name fallback संभालता है जो किसी नंगे नाम के अस्पष्ट होने पर अनुमान लगाने
   से इनकार कर देता है।
3. **Render।** हर बचा हुआ view एक बार render होता है (कभी दोबारा नहीं बनता),
   source-link resolver, registry-backed link resolver, और `@tutorial` resolver
   को mdast में पिरोते हुए।

manifest पर `buildId` pages के slugs + bodies पर एक `{timestamp}-{hash}` digest
है — content-stable, ताकि dwar सही ढंग से cache-bust कर सके।

## क्या वापस आता है

`generateSite` एक
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
लौटाता है:

```ts
interface SiteManifest {
  pages: Page[];
  nav: NavNode[];
  pkg?: { name?; version?; description?; repository?; homepage? };
  buildId: string;
}
```

manifest self-contained है: dwar को कभी doclet database दोबारा नहीं पढ़ना चाहिए।
आप इस object को सीधे [`dwar.render()`](/packages/dwar-overview) को सौंपते हैं।

## source पढ़ें

maintainer चाहता है कि आपको code की ओर भेजा जाए — यहाँ से शुरू करें:

- **Package directory:**
  [packages/setu](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu)
  ·
  [packages/setu/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src)
- **entry point + options:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  (`generateSite`, `GenerateSiteOptions`)
- **build engine:**
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  (दो-pass build, `assembleNav`, `enumerateLongnamesByKind`, `buildGlobalsView`)
- **Container views:**
  [`class-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/class-view.ts)
  (`getContainerView`, kind-parametric)
- **Prose pages:**
  [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  (README → home, docs → guides, `tutorialsToDocInputs`)
- **Source viewer:**
  [`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)
- **Cross-references:**
  [`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)
- **MDX serialization:**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  और
  [`mdast/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src/mdast)
  directory

## आगे

- [setu Examples](/packages/setu-examples) — असली call shape, उन दो bridges से जो
  setu का उपभोग करते हैं।
- [dwar Overview](/packages/dwar-overview) — वह package जो `SiteManifest` को
  render करता है।
- [utils Overview](/packages/utils-overview) — साझा boundary contract जिसे setu
  import करता है।
