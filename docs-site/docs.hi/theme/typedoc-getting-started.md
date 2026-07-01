---
title: TypeDoc के साथ शुरुआत
group: Using the Theme
order: 3
---

# TypeDoc के साथ शुरुआत

TypeScript projects के लिए, theme एक **TypeDoc plugin** के रूप में ship होता है —
`@clean-jsdoc-theme/typedoc`। यह TypeDoc के default को विस्तृत करने वाला कोई CSS
theme नहीं है; यह एक custom **output** register करता है जो TypeDoc की reflections
को *उसी* `setu → dwar` pipeline से गुज़ारता है जिससे JSDoc bridge गुज़ारता है।
नतीजा एक समान site है — SSR HTML, islands, fuzzy + full-text search, साथी `.md` —
जो आपके TypeScript sources से generate होती है।

> [!NOTE]
> **यह कैसे जुड़ता है।** plugin का
> [`load(app)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/index.ts)
> एक option block (`cleanJsdocTheme`, देखें
> [`options.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/options.ts))
> घोषित करता है और `app.outputs.addOutput(...)` के ज़रिए `clean-jsdoc-theme` नाम
> का एक output register करता है। writer
> ([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
> reflections → doclets → साझा pipeline में ढाल देता है। तो आप इसे दो तरह से चुनते
> हैं: `plugin` इसे load करता है, `outputs` इसे चालू करता है।

## Install और build

<steps>

<step label="Install">

TypeDoc और theme के TypeDoc plugin को dev dependencies के रूप में install करें:

<tabs>

<tab label="npm">

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

</tab>

</tabs>

</step>

<step label="Configure">

एक `typedoc.json` जोड़ें। plugin को load करें, इसे एक **output** के रूप में चुनें,
और theme options को **`cleanJsdocTheme`** key के नीचे रखें (JSDoc के `opts` का
TypeDoc समतुल्य):

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",

  // plugin को load करें, फिर render करने के लिए उसका output चुनें।
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],

  // Theme options यहाँ रहते हैं।
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</step>

<step label="Build">

TypeDoc चलाएँ — यह register किए गए output को `outputs[].path` पर render करता है:

```sh
npx typedoc
```

</step>

<step label="Serve">

`dist/index.html` खोलें, या folder को serve करें (Pagefind का full-text index
load होने के लिए HTTP चाहिए):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> एक पूर्ण, चलने-योग्य TypeDoc setup repo में
> [`examples/typedoc-basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/typedoc-basic)
> पर मौजूद है — इसकी
> [`typedoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/typedoc-basic/typedoc.json)
> ऊपर दिए गए setup का reference है।

## options कहाँ जाते हैं

हर theme option JSDoc वाले जैसा ही है — सिर्फ़ स्थान अलग है: `opts` के बजाय
**`cleanJsdocTheme`** के नीचे। पूरी सूची, दोनों रूपों के साथ-साथ,
[Configuration](/theme/configuration) page पर है। शुरुआत के लिए कुछ:

| Option | यह क्या करता है |
| ------ | --------------- |
| [`siteName`](/theme/configuration#sitename) | Header का title — सादा text, या `alt` fallback text के साथ एक `light`/`dark` logo set। |
| [`fonts`](/theme/configuration#fonts) | `heading` / `body` (Google Fonts, आपके लिए load होते हैं) और `mono` को override करें। |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | light / dark palettes को फिर से रंगें — सिर्फ़ `bg`, `accent`, … override करें, बाक़ी रहने दें। |
| [`sectionOrder`](/theme/configuration#sectionorder) | top-level sidebar sections का क्रम तय करें। |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | संबंधित entries को एक साझा, collapsible parent के नीचे समेटें। |
| [`menu`](/theme/configuration#menu) | sidebar के ऊपर pin किए गए custom links, हर एक के साथ एक `lucide:` / `simpleicons:` icon। |
| [`copyPage`](/theme/configuration#copypage) | प्रति-page "copy page" / "open in LLM" button (default में on)। |

> [!NOTE]
> चूँकि `cleanJsdocTheme` एक समर्पित namespace है, इसके भीतर अनजान keys सिर्फ़
> **warn** करती हैं (एक "did you mean?" संकेत के साथ) — इसे error तक बढ़ाने के लिए
> [`strict`](/theme/configuration#strict) देखें।

## The TypeDoc sidebar

TypeDoc output की sidebar JSDoc template के kind-bucket layout (top-level
"Classes", "Interfaces", "Enumerations", … sections) का उपयोग **नहीं** करती।
इसके बजाय यह **TypeDoc की अपनी default theme** को mirror करती है — एक
module/folder पदानुक्रम:

- **Top level = पहले आपके documents, फिर folders और modules**, alphabetically।
  कोई top-level kind sections नहीं होते।
- **Folders** आपके source की directory structure से आते हैं। एक अकेले child
  वाला folder उस child में **merge** हो जाता है (`compactFolders`) — जैसे
  `base/` के नीचे एक अकेला `Component` दो nested levels के बजाय
  `base/Component` के रूप में दिखता है।
- **हर module एक clickable, expandable node है**: उसके label पर क्लिक करने से
  module का अपना page खुलता है; chevron उसे expand करके उसके members दिखाता
  है।
- **Members अपने module के नीचे nest होते हैं**, **kind** से क्रमित होकर —
  Enumerations → Classes → Interfaces → Type Aliases → Variables → Functions —
  फिर नाम से alphabetically। sidebar में स्वयं कोई per-kind sub-headings नहीं
  होते (kind grouping module के अपने page body पर अब भी दिखती है)।
- किसी module के भीतर nested **Namespaces** उसी तरह nested nodes के रूप में
  दिखते हैं।

> [!IMPORTANT]
> यह JSDoc template की sidebar से एक अलग मॉडल है। [Structure your
> sidebar](/guides/structure-your-sidebar) में प्रलेखित ordering लीवर —
> `@category`, `@order`, `sectionOrder`, `clubSidebarItems` — **TypeDoc API
> sidebar को आकार नहीं देते**। ऊपर वाला module पदानुक्रम ही इसका मालिक है, जो
> TypeDoc के अपने defaults से मेल खाता है (जहाँ category/group-driven
> navigation opt-in है)। एक category/group-driven TypeDoc nav बहाल करना
> **फ़िलहाल configurable नहीं है**।
>
> TypeDoc के लिए क्या अब भी काम करता है: prose **doc groups** (`docGroups` +
> किसी doc page की frontmatter `group` / `order`) अब भी render होते हैं — API
> पदानुक्रम से पहले — और `docGroups` के ज़रिए क्रमित होते हैं; **`menu`**
> top region अब भी काम करता है; tutorials अब भी render होते हैं। पूरा विवरण
> देखें [Structure your sidebar](/guides/structure-your-sidebar#typedoc-flavor)।

## TypeDoc-specific rendering

sidebar से आगे, TypeDoc output कुछ ऐसी चीज़ें render करता है जो JSDoc template
नहीं करता, क्योंकि वे TypeDoc के अपने analysis से आती हैं:

- **Inheritance & relationships.** Class और interface pages को एक
  **Hierarchy** list (ancestor chain), एक **Implements** section, और एक
  **Implemented By** section मिलते हैं। व्यक्तिगत members को captions मिलते हैं
  — **Inherited from …**, **Overrides …**, **Implementation of …** — जो
  संबंधित symbol की ओर इंगित करते हैं।
- **`@group`.** `@category` के सिबलिंग के रूप में पहचाना जाता है। यह parse
  होता है, पर — `@category` की तरह ही — यह default TypeDoc sidebar को नहीं
  चलाता (ऊपर देखें)।
- **Native TypeDoc `projectDocuments`.** TypeDoc के अपने
  [`projectDocuments`](https://typedoc.org/options/input/#projectdocuments)
  option के ज़रिए attach की गई Markdown files pages के रूप में render होती
  हैं। यह theme के अपने [`docs`](/theme/configuration#docs) option से
  **अलग** है:
  - [`docs`](/theme/configuration#docs) theme की prose-docs directory है — यह
    JSDoc और TypeDoc दोनों के लिए एक जैसे काम करती है।
  - `projectDocuments` एक TypeDoc-native input है, जो केवल TypeDoc output को
    उपलब्ध है।

  दोनों अंततः site में सामान्य pages बन जाते हैं, तो चुनें कि कौन सा tool file
  list का मालिक हो: एक साझा, tool-agnostic guides folder के लिए `docs` उपयोग
  करें; अगर आप अपने docs को पहले से TypeDoc-native तरीके से organize कर रहे
  हैं तो `projectDocuments` उपयोग करें।
- **`@inheritDoc`.** `{@inheritDoc Target}` से (या किसी overriding/implementing
  member पर एक bare `@inheritDoc` से) प्रलेखित एक member अपने स्थान पर target
  का description और parameter/return docs दिखाता है। TypeDoc reference को
  resolve करता है; theme परिणामी content render करता है — default TypeDoc
  semantics से मेल खाते हुए।
- **Async modifier badge.** जो methods `async` हैं (या एक `Promise` लौटाते
  हैं) उनके signature के बगल में एक **async** modifier badge दिखता है।
- **Object-literal type expansion.** एक inline object-literal type — किसी
  parameter पर, किसी return type पर, या एक type alias/variable पर — एक
  **property table** में expand हो जाता है: प्रति member एक row, जिसमें name,
  type, optional flag, और description होता है। table के अंदर type references
  अपने प्रलेखित pages से **linked** बने रहते हैं।

## कई भाषाएँ

localization workflow अपनी locales को उसी `cleanJsdocTheme` block में declare
करता है (`locales` + `defaultLocale`) और `clean-jsdoc` CLI के ज़रिए चलता है — देखें
**[अपने docs को localize करें](/guides/localize-your-docs)** और
[`locales` / `defaultLocale`](/theme/configuration#localization) reference।

> [!INFO]
> आज TypeDoc bridge translation catalogs को **extract** कर सकता है पर प्रति-locale
> sites अभी render नहीं करता — localized *builds* फ़िलहाल केवल JSDoc के लिए हैं।
> एकल-भाषा TypeDoc site पूरी तरह समर्थित है।

## आगे के कदम

- **[Build an API reference](/guides/build-an-api-reference)** — क्या एक page
  बनता है और source-file viewer कैसे काम करता है।
- **[Build a guides site](/guides/build-a-guides-site)** और
  **[Combine guides + API](/guides/combine-guides-and-api)** — उसी site में हाथ से
  लिखे Markdown जोड़ें।
- **[Structure your sidebar](/guides/structure-your-sidebar)** — grouping और
  ordering के levers (यह JSDoc से कैसे अलग है यह जानने के लिए इसका **TypeDoc
  flavor** section देखें)।
- **[Authoring](/components/callouts)** — callouts, steps, tabs, और embeds।
- **[अपने docs को localize करें](/guides/localize-your-docs)** — कई-भाषा workflow
  (extract TypeDoc पर काम करता है; localized builds आज केवल JSDoc के लिए हैं)।
- **[Packages](/#the-packages)** — साझा `setu → dwar` pipeline (और
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) पर्दे के पीछे कैसे काम करते हैं।
