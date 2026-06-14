---
title: उदाहरण
group: Packages/setu
order: 21
---

# setu Examples

setu **internal** है। आप एक सामान्य docs build में `generateSite` को call नहीं
करते — JSDoc और TypeDoc bridges आपके लिए इसे call करते हैं। आप इसकी ओर सीधे तभी
बढ़ते हैं जब आप एक *custom bridge* बना रहे हों (एक नया front-end जो एक salty doclet
collection produce करता है)। इसलिए यहाँ के ईमानदार उदाहरण theme के साथ ship होने
वाले दो असली bridges हैं।

अगर आप सिर्फ़ theme को configure करना चाहते हैं, तो इसके बजाय
[Configuration](/theme/configuration) और [guides](/guides/build-an-api-reference)
देखें।

## The call shape

दोनों bridges एक salty doclet collection बनाते हैं, एक options object assemble
करते हैं, और `generateSite` को call करते हैं। नीचे का हर field
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
में `GenerateSiteOptions` पर मौजूद है — कुछ भी आविष्कृत नहीं है।

यह TypeDoc bridge है, जो पूरी तरह ESM है और setu को सीधे import करता है (से
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)):

```ts
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';

// reflections → flat doclets → a salty collection (the shape setu consumes).
const doclets = reflectionsToDoclets(project, logger);
const collection = salty.taffy(doclets);

const manifest = generateSite(collection, {
  ...(pkg ? { pkg } : {}),                         // package.json fields
  ...(readme ? { readme } : {}),                   // README HTML → home page
  ...(sources.length > 0 ? { sources } : {}),      // SourceFileInput[] → viewer pages
  ...(sectionOrder ? { sectionOrder } : {}),        // sidebar section order
  ...(menu ? { menu } : {}),                        // full sidebar menu
  ...(clubSidebarItems ? { clubSidebarItems } : {}),// prefix-group sidebar entries
});
```

JSDoc bridge वही करता है, साथ ही वे options जो केवल एक JSDoc run से अर्थपूर्ण हैं —
tutorials, docs directory, doc-group ordering, और source-link target (से
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)):

```ts
const manifest = generateSite(data, {
  ...(pkg ? { pkg } : {}),
  ...(readme ? { readme } : {}),
  ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
  ...(sources.length > 0 ? { sources } : {}),
  ...(sources.length > 0 && sourceLinkToComment ? { sourceLinkToComment } : {}),
  ...(docs.length > 0 ? { docs } : {}),
  ...(docGroups ? { docGroups } : {}),
  ...(defaultDocGroup ? { defaultDocGroup } : {}),
  ...(sectionOrder ? { sectionOrder } : {}),
  ...(menu ? { menu } : {}),
  ...(clubSidebarItems ? { clubSidebarItems } : {}),
});
```

pattern पर ध्यान दें: हर option conditionally spread होता है, इसलिए एक अनुपस्थित
feature बस pass नहीं होती। **एकमात्र आवश्यक argument collection है** — `generateSite`
के दोनों arguments अन्यथा इस बात से driven हैं कि bridge ने क्या पाया।

### पूरी option surface

`GenerateSiteOptions` पर हर field
([`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)):

| Option | यह क्या करता है |
| --- | --- |
| `pkg` | package.json fields manifest में embedded (header/footer/OG tags)। |
| `readme` | Project README **HTML के रूप में** → site home page (slug `''`)। |
| `tutorials` | एक `TutorialInput[]` tree → "Tutorials" के नीचे guide pages। |
| `docs` | एक `DocInput[]` list (bridge द्वारा पूर्व-पठित) → prose/guide pages। एक root `index` home page बन जाता है। |
| `docGroups` | Top-level doc-group display order। |
| `defaultDocGroup` | बिना group वाले एक doc page के लिए group label। |
| `sources` | एक `SourceFileInput[]` → read-only source-viewer pages + `Source:` links। |
| `sourceLinkToComment` | `true` → `Source:` links declaration के बजाय doc-comment line की ओर इशारा करते हैं (default `false`)। |
| `sectionOrder` | एक एकीकृत list जो `@category` names, doc groups, और kind labels को order करती है। |
| `menu` | पूरा sidebar menu (`sectionOrder` पर वरीयता लेता है)। |
| `clubSidebarItems` | संबंधित entries को one-level prefix subtrees में club करता है। |

## जो वापस आता है, और कहाँ जाता है

`generateSite` एक
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
लौटाता है — `pages`, `nav`, एक optional `pkg`, और एक content-stable `buildId`:

```ts
const manifest = generateSite(collection, opts);
// manifest.pages   — Page[]  (one per symbol + globals + prose + source pages)
// manifest.nav     — NavNode[] (the sidebar tree)
// manifest.buildId — string  (timestamp + content hash, for cache busting)
```

> manifest **कोई search index field नहीं** रखता। setu की per-page bodies वही हैं
> जो बाद में search को feed करती हैं; manifest ख़ुद बस `{ pages, nav, pkg?, buildId }`
> है।

अगला कदम हमेशा वही होता है: manifest को सीधे
[`dwar.render()`](/packages/dwar-overview) को सौंप दें, जो इसे HTML में बदलता है।
दोनों bridges ठीक यही करते हैं:

```ts
import { render } from '@clean-jsdoc-theme/dwar';

const result = await render(manifest, { theme, destination });
await writeOutputFiles(destination, result.files);
```

setu ने model produce किया; dwar उसे render करता है। दोनों कभी एक-दूसरे को import
नहीं करते — वे केवल [utils](/packages/utils-overview) में परिभाषित `SiteManifest`
type पर मिलते हैं।

## Authored features setu behavior में कैसे map होते हैं

आप अपने source comments और docs files में जो लिखते हैं वह यहाँ manifest structure
बन जाता है। कुछ connections जानने योग्य हैं:

- **`@category` और `@order`.** एक API symbol का `@category Core/Parsing order=1`
  tag उसका sidebar group बन जाता है (एक `/`-path इसे nest करता है: `Core` ▸
  `Parsing`) और उसकी within-group sort key। एक standalone `@order N` *किसी भी*
  symbol को position करता है — यहाँ तक कि एक untagged `@class` को भी — उसके kind
  section के भीतर।
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  में parse किया जाता है। देखें [अपना sidebar structure करें](/guides/structure-your-sidebar)
  और [Custom tags](/authoring/custom-tags)।
- **README → home.** आपका README (JSDoc/TypeDoc द्वारा HTML में rendered) slug `''`
  पर home page बन जाता है,
  [`buildReadmePage`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  के ज़रिए। आपकी docs directory में एक root `index.md` इसे override करता है।
- **Docs folder → guide pages.** आपकी docs directory के नीचे हर Markdown/HTML file
  अपने clean (unprefixed) slug पर एक prose page बन जाती है, अपने frontmatter
  `group` या अपने directory path द्वारा grouped,
  [`buildDocPages`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  के ज़रिए। Frontmatter `title` / `group` / `order` / `hidden` का सम्मान किया जाता
  है। देखें [एक guides site बनाएँ](/guides/build-a-guides-site)।
- **`{@link}` / `@see` / `@tutorial`.** pass 2 में बनी link registry के विरुद्ध
  resolve किए जाते हैं — केवल वे targets resolve होते हैं जिनके पास वास्तव में एक
  page या member heading है; बाक़ी एक broken anchor के बजाय inert text पर fall back
  करते हैं
  ([`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts))।

## Read the source

ये canonical, working usages हैं — ऊपर के किसी snippet पर भरोसा करने के बजाय इन्हें
पढ़ें:

- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — `salty.taffy` के साथ collection बनाता है, `generateSite` को call करता है,
  manifest को `render` को सौंपता है।
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — वह `publish(data, opts, tutorials)` entry जिसे JSDoc invoke करता है; sources,
  docs, और tutorials collect करता है, फिर `generateSite` को call करता है।
- **The options type:**
  [`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)

## आगे

- [setu सिंहावलोकन](/packages/setu-overview) — setu क्यों मौजूद है और इसकी contract
  boundaries।
- [dwar सिंहावलोकन](/packages/dwar-overview) — `SiteManifest` का उपभोग क्या करता है।
- [एक API reference बनाएँ](/guides/build-an-api-reference) — वह end-to-end path जिसे
  ये bridges power करते हैं।
