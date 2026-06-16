---
title: JSDoc के साथ शुरुआत
group: Using the Theme
order: 2
---

# JSDoc के साथ शुरुआत

`clean-jsdoc-theme` एक **JSDoc template** है। JSDoc वही करता है जो वह हमेशा करता
है — आपके source को parse करना और doc comments इकट्ठा करना — और फिर template के
`publish` function को कमान सौंप देता है, जहाँ से यह theme कमान सँभालकर static site
बनाता है। आप बस JSDoc को theme पर इंगित करते हैं, और काम पूरा।

> [!NOTE]
> **यह कैसे जुड़ता है।** JSDoc किसी template को उसके exported `publish` function को
> call करके load करता है — यहाँ वह
> [`publish(data, opts, tutorials)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
> है (package का `main`, `dist/publish.js`)। यह आपकी doclet collection लेता है और
> उसे `setu → dwar` pipeline से गुज़ारता है। हर stage क्या करता है, यह जानने के लिए
> [Packages](/) देखें।

## Install और build

<steps>

<step label="Install">

JSDoc और theme को dev dependencies के रूप में install करें:

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Configure">

अपने project root में एक `jsdoc.json` जोड़ें। एक छोटा पर वास्तविक शुरुआती बिंदु:

```json5
{
  source: { include: ["./src", "./README.md"] },

  // ज़रूरी — नीचे दी गई चेतावनी देखें।
  plugins: ["plugins/markdown"],

  opts: {
    // JSDoc को theme पर इंगित करें। CLI पर `jsdoc -t <path>` के समतुल्य।
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** plugin ज़रूरी है। JSDoc आपके doc comments के Markdown को
> theme के देखने से पहले ही **HTML** में render कर देता है, और theme उसी HTML को
> consume करता है (देखें
> [`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts))।
> इसके बिना descriptions कच्चे, बिना-format किए text के रूप में पहुँचती हैं।

</step>

<step label="Build">

config के विरुद्ध JSDoc चलाएँ:

```sh
npx jsdoc -c jsdoc.json
```

</step>

<step label="Serve">

site `dist/` में लिखी जाती है। `dist/index.html` खोलें, या folder को serve करें
(Pagefind का full-text index load होने के लिए HTTP चाहिए):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> एक पूर्ण, चलने-योग्य JSDoc setup repo में
> [`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic)
> पर मौजूद है — इसकी
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)
> और source comments इस page की हर बात का reference हैं।

## options कहाँ जाते हैं

theme options आपके `jsdoc.json` में **`opts`** के नीचे, JSDoc के अपने options के
साथ रहते हैं। पहले-पहल काम आने वाले कुछ — पूरी सूची, TypeDoc रूप के साथ-साथ, के लिए
[Configuration](/theme/configuration) page देखें।

| Option | यह क्या करता है |
| ------ | --------------- |
| [`siteName`](/theme/configuration#sitename) | Header का title — सादा text, या `alt` fallback text के साथ एक `light`/`dark` logo set। |
| [`fonts`](/theme/configuration#fonts) | `heading` / `body` (Google Fonts, आपके लिए load होते हैं) और `mono` को override करें। |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | light / dark palettes को फिर से रंगें — सिर्फ़ `bg`, `accent`, … override करें, बाक़ी रहने दें। |
| [`sectionOrder`](/theme/configuration#sectionorder) | top-level sidebar sections का क्रम तय करें। |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | संबंधित entries को एक साझा, collapsible parent के नीचे समेटें। |
| [`menu`](/theme/configuration#menu) | sidebar के ऊपर pin किए गए custom links, हर एक के साथ एक `lucide:` / `simpleicons:` icon। |
| [`tutorials`](/theme/configuration#tutorials) / [`docs`](/theme/configuration#docs) | हाथ से लिखे Markdown guides को generate हुए reference के साथ render करें। |
| [`copyPage`](/theme/configuration#copypage) | प्रति-page "copy page" / "open in LLM" button (default में on)। |

> [!NOTE]
> कुछ options — [`outputSourceFiles`](/theme/configuration#outputsourcefiles) और
> [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment) — सिर्फ़ JSDoc
> के लिए हैं और `opts` के नहीं, बल्कि `templates.default` के नीचे बैठते हैं (theme
> उन्हें `jsdoc/env` से पढ़ता है)। ये Configuration page पर चिह्नित हैं।

## कई भाषाएँ

theme आपके docs को **कई भाषाओं** में render कर सकता है — हर locale के लिए अपना
static site (default root पर, बाक़ी `/<locale>` के नीचे), साथ में एक header
language switcher। आप `opts.locales` में अपनी locales declare करते हैं, फिर
`clean-jsdoc` CLI से translation + per-locale builds चलाते हैं:

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
  defaultLocale: "en",
}
```

बिना `locales` के build पर कोई असर नहीं पड़ता। पूरे workflow (`extract` → translate
→ `build`) के लिए **[Localize your docs](/guides/localize-your-docs)** देखें, और
[`locales` / `defaultLocale`](/theme/configuration#localization) reference भी।

## आगे के कदम

- **[Build an API reference](/guides/build-an-api-reference)** — क्या एक page
  बनता है, source-file viewer, और `Source: file:line` links।
- **[Build a guides site](/guides/build-a-guides-site)** और
  **[Combine guides + API](/guides/combine-guides-and-api)** — उसी site में हाथ से
  लिखे Markdown जोड़ें।
- **[Structure your sidebar](/guides/structure-your-sidebar)** — `@category`,
  `@order`, और sidebar options।
- **[Authoring](/components/callouts)** — callouts, steps, tabs, और embeds जिन्हें
  आप comments और prose में इस्तेमाल कर सकते हैं।
- **[Localize your docs](/guides/localize-your-docs)** — site को कई भाषाओं में
  ship करें।
- TypeScript पसंद है? देखें
  **[TypeDoc Getting Started](/theme/typedoc-getting-started)** — वही output, अलग
  toolchain।
