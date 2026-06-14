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
  ordering के levers।
- **[Authoring](/authoring/callouts)** — callouts, steps, tabs, और embeds।
- **[अपने docs को localize करें](/guides/localize-your-docs)** — कई-भाषा workflow
  (extract TypeDoc पर काम करता है; localized builds आज केवल JSDoc के लिए हैं)।
- **[Packages](/#the-packages)** — साझा `setu → dwar` pipeline (और
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) पर्दे के पीछे कैसे काम करते हैं।
