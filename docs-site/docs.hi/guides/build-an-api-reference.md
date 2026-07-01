---
title: एक API reference बनाएँ
group: Guides
order: 1
---

# एक API reference बनाएँ

यह **pure-API** workflow है: tool को अपने source code की ओर इंगित करें और उसे
आपकी doc comments से एक reference साइट generate करने दें — प्रति class, module,
namespace आदि एक page, साथ में एक वैकल्पिक source-file viewer। यही वह है जिससे
[API demo](/api-docs/) बनाया गया है,
[`docs-site/jsdoc.api.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.api.json)
का उपयोग करते हुए।

> [!TIP]
> क्या आपके पास हाथ से लिखे guides भी हैं? आपको चुनना नहीं पड़ता — दोनों को एक
> साइट में भेजने के लिए देखें
> [Combine guides + API](/guides/combine-guides-and-api)।

## इसे सेट करें

पूरा toolchain setup getting-started guides में रहता है; यह page इस पर केंद्रित
है कि क्या page बनता है और source viewer कैसे काम करता है। अपना tool चुनें:

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

`source.include` को अपने code की ओर इंगित करें। install + build steps के लिए देखें
[JSDoc Getting Started](/theme/jsdoc-getting-started)।

```json5
{
  source: { include: ["./src", "./README.md"] },
  // Required: pre-renders Markdown in your doc comments to HTML.
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** plugin आवश्यक है। इसके बिना build तुरंत विफल हो जाता है
> — theme यह अपेक्षा करता है कि आपकी doc-comment Markdown पहले से ही HTML में
> render हो चुकी हो।

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

`entryPoints` को अपने code की ओर इंगित करें और theme plugin load करें। पूरे setup
के लिए देखें [TypeDoc Getting Started](/theme/typedoc-getting-started)।

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</tab>
</tabs>

## क्या page बनता है

> [!NOTE]
> नीचे बताई गई kind-section sidebar **JSDoc** flavor है। TypeDoc भी यही सभी
> pages बनाता है, पर उन्हें kind sections के बजाय एक module/folder पदानुक्रम
> में प्रस्तुत करता है — देखें
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar)।

setu आपके documented symbols की गणना करता है और प्रत्येक को एक page में बदल देता
है। जिन kinds को **अपना खुद का** page मिलता है, वे हैं **container kinds**, इस
क्रम में बनाई गईं (देखें
[`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
में `CONTAINER_KINDS`):

| Kind        | Sidebar section |
| ----------- | --------------- |
| `module`    | Modules         |
| `namespace` | Namespaces      |
| `class`     | Classes         |
| `interface` | Interfaces      |
| `mixin`     | Mixins          |
| `typedef`   | Typedefs        |

प्रत्येक को एक ही container path के माध्यम से render किया गया एक page मिलता है,
जिसके members sections में बाँट दिए जाते हैं। **Typedefs first-class हैं** — वे
उसी `buildContainerPage` path से गुज़रते हैं, इसलिए किसी typedef का `@type`,
`@property` list, और (function-signature typedefs के लिए) `@param`/`@returns` सब
उसके page पर render होते हैं।

> [!NOTE]
> ऊपर का क्रम **slug-collision precedence** भी है: जब दो symbols एक ही slug का
> दावा करें, तब पहले वाला kind जीतता है (तो एक `module` बाद के `class` को हरा
> देता है)। `CONTAINER_KINDS` ordering और
> [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
> में dedup pass में सत्यापित।

### Globals page

हर **global-scope** symbol जिसे पहले से अपना page *नहीं* मिलता — functions,
members, constants, enums, events — एक एकल synthetic **Globals** page (slug
`global`) पर एकत्र किया जाता है। बाहर रखे गए kinds ठीक ऊपर वाले container kinds
हैं, साथ में `typedef`, क्योंकि वे पहले ही standalone render हो जाते हैं। यदि कोई
योग्य globals नहीं हैं, तो कोई Globals page उत्पन्न नहीं होता। देखें
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में `buildGlobalsView`।

जिस symbol kind का कोई section mapping नहीं है, वह एक catch-all **Other** section
में आता है, जो सबसे अंत में जोड़ा जाता है — एक सुरक्षा-जाल जो व्यवहार में खाली
रहता है।

## Source-file viewer

जब source viewing चालू हो, theme प्रत्येक project source file को एक read-only,
syntax-highlighted viewer page के रूप में render करता है, एक **Source Files**
index बनाता है, और प्रत्येक documented member को उसकी declaration से एक
`Source: file:line` link के साथ जोड़ता है।

यह JSDoc के [`outputSourceFiles`](/theme/configuration#outputsourcefiles) से gated
है (default **on**)। यह एक JSDoc-only option है जो `templates.default` के अंतर्गत
रहता है:

```json5
// jsdoc.json — turn the source viewer OFF
templates: { default: { outputSourceFiles: false } }
```

links कैसे हल होते हैं (देखें
[`packages/setu/src/source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)):

- प्रत्येक file `source/<slugified-path>` पर एक hidden `kind: 'source'` page बन
  जाती है; language को extension से पहचाना जाता है (Monaco ids — `js`/`mjs`/`jsx`
  → `javascript`, `ts`/`mts`/`tsx` → `typescript`, आदि)।
- किसी member का `Source:` link एक line (`#L<n>`) पर anchored उस file page की ओर
  इंगित करता है। **default** रूप से यह वास्तविक **declaration** की पहली line पर
  उतरता है, अग्रणी doc-comment block को लाँघते हुए। इसके बजाय comment की प्रारंभिक
  line पर उतरने के लिए
  [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment) (`true`) सेट
  करें (pre-v5 व्यवहार)।
- "Source Files" index sidebar में हमेशा सबसे अंत में रहता है। आप इसे `{ id:
  "source" }` के साथ एक menu item के रूप में भी सामने ला सकते हैं (देखें
  [`examples/basic/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json))।

> [!CAUTION]
> `outputSourceFiles` और `sourceLinkToComment` options **JSDoc-only** हैं — वे
> `templates.default` के अंतर्गत रहते हैं, न कि `opts`/`cleanJsdocTheme` के
> अंतर्गत। TypeDoc projects में ये नहीं होते।

## API sidebar को क्रमित करना

default रूप से kind sections एक निश्चित क्रम में render होते हैं (Classes,
Modules, Namespaces, Mixins, Interfaces, Typedefs, Globals, …)। इसे
[`sectionOrder`](/theme/configuration#sectionorder) से override करें, और अधिक
सूक्ष्म नियंत्रण के लिए अपने symbols पर `@category` / `@order` tags का उपयोग
करें। यह अपने आप में एक विषय है —
[Structure your sidebar](/guides/structure-your-sidebar) हर लीवर को कवर करता है।

> [!NOTE]
> ऊपर वाले लीवर (`sectionOrder`, `@category`, `@order`) **JSDoc** API sidebar
> को आकार देते हैं। TypeDoc API sidebar एक module/folder पदानुक्रम है और इनसे
> क्रमित नहीं होती — देखें
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor)।

## आगे कहाँ जाएँ

- reference के साथ-साथ हाथ से लिखे guides जोड़ें:
  [Combine guides + API](/guides/combine-guides-and-api)।
- Custom source tags (`@category`, `@order`): [Custom tags](/components/overview)।
- हर option विस्तार से: [Configuration](/theme/configuration)।
- package के आंतरिक भाग: [Packages](/#the-packages)।
