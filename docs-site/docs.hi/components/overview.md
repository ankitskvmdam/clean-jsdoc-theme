---
title: Overview
group: Components
order: 1
---

# Custom tags

> [!NOTE]
> **यह कहाँ काम करता है — source comments.** ये JSDoc/TypeDoc doc-comment tags
> हैं, जो आपके source में लिखे जाते हैं। Prose pages के पास इनके समतुल्य हैं:
> `group` / `order` frontmatter `@category` / `@order` को प्रतिबिंबित करते हैं,
> और ` ```iframe ` fence `@iframe` को प्रतिबिंबित करता है
> ([Embeds](/guides/embeds) देखें)।

Theme कुछ ऐसे doc-comment block tags पढ़ता है जो आधार JSDoc और TypeDoc आपको नहीं
देते। ये sidebar को आकार देते हैं और source comments को live demos embed करने
देते हैं:

- **`@category <path> [order=N]`** — किसी symbol के page को एक स्पष्ट sidebar
  group में रखें (और वैकल्पिक रूप से उसे क्रमबद्ध करें)।
- **`@order N`** — किसी भी symbol के लिए एक स्वतंत्र within-group sort key।
- **`@iframe <url> key=value`** — किसी source comment से एक live demo embed करें।

Category/order parsing
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में रहती है (`parseCategory` / `readOrder`); `@iframe`
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
में संभाला जाता है।

> [!IMPORTANT]
> ये तीनों **unknown tags** हैं — आधार JSDoc इन्हें परिभाषित नहीं करता। आपके
> config को `jsdoc.json` में `tags.allowUnknownTags: true` set करना होगा (इस
> site का
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> ऐसा करता है)। इसके बिना JSDoc theme के चलने से पहले ही इन tags को हटा देता है।

## `@category` — किसी symbol को group करें

`@category` किसी symbol के generated page को उसके default kind section (Classes,
Modules, …) के बजाय एक स्पष्ट sidebar group में रखता है:

```ts
/**
 * @category Core
 */
export class Parser {}
```

### Path tokens space से जुड़ते हैं; केवल `/` nest करता है

यह सूक्ष्म हिस्सा है, और इसे सही समझना ज़रूरी है। `parseCategory` tag text को
whitespace पर विभाजित करता है, फिर:

- सादे tokens की **अग्रणी श्रृंखला** ही **group path** है, जो **एकल space से जुड़ी**
  होती है। तो `@category Getting Started` एक सपाट group है जिसका नाम शाब्दिक रूप से
  `Getting Started` है — space नाम का हिस्सा बना रहता है।
- Parsing पहले ऐसे token पर **options** में बदल जाती है जिसमें `=` हो। वहाँ से आगे
  की हर चीज़ `key=value` है।
- एक शाब्दिक **`/`** ही वह चीज़ है जो किसी group को **nest** करती है —
  `Core/Parsing` page को **Core ▸ Parsing** के नीचे nest करता है। Spaces nest
  नहीं करते।

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

यह `Lexer` को **Core ▸ Parsing** के नीचे रखता है, उस subgroup में सबसे पहले
क्रमबद्ध करते हुए। किसी symbol पर पहला `@category` जीतता है।

### Inline `order=`

आज `@category` का एकमात्र option `order` है — within-group sort key। एक अनुपस्थित
या non-numeric `order` undefined छोड़ दिया जाता है (page अंत में, alphabetically
क्रमबद्ध होता है, जैसे एक untagged page)।

## `@order` — किसी भी symbol को क्रमबद्ध करें

Inline `order=` option केवल उस symbol पर लागू होता है जिसके पास एक `@category`
**हो**। किसी ऐसे symbol को स्थापित करने के लिए जो अपने **kind section** में रहता है
— बिना किसी category वाला एक सादा `@module`, `@class`, `@namespace` — स्वतंत्र
`@order` tag का उपयोग करें:

```ts
/**
 * @module config
 * @order 1
 */
```

एक अनुपस्थित या non-numeric मान undefined छोड़ दिया जाता है (अंत में क्रमबद्ध
होता है)।
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में `readOrder` देखें।

### Precedence: `@category … order=` `@order` पर जीतता है

जब कोई symbol **दोनों** एक `@category … order=` option और एक स्वतंत्र `@order`
रखता है, तो inline `@category` order **जीतता है** — यह अधिक विशिष्ट, सह-स्थित
declaration है। हल किया गया order `renderContainerPage` में
`category?.order ?? readOrder(doclet)` के रूप में परिकलित होता है। दोनों उसी
`frontmatter.order` को feed करते हैं जिसे sidebar पढ़ता है।

```ts
/**
 * `order=1` (from @category) wins; the @order 9 below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

## `@iframe` — source से एक live demo embed करें

`@iframe` किसी doc comment से सीधे एक sandboxed iframe embed करता है, उसी grammar
का उपयोग करते हुए जो prose ` ```iframe ` fence इस्तेमाल करता है:

```js
/**
 * @iframe https://example.com/embed/demo title="Live demo" height=420
 */
export function render() {}
```

प्रत्येक मान्य `@iframe` symbol के `@example` section के बाद एक `<Embed>` render
करता है; अमान्य configs (non-`https`, बिना URL) हटा दिए जाते हैं। पूरा config
grammar — स्वीकृत URL schemes, हर option, और `themed` / `{theme}` व्यवहार —
[Embeds & live demos](/guides/embeds) पर documented है।

## `@category` और `@order` sidebar को कैसे आकार देते हैं

ये tags उन levers में से दो हैं जो theme के एकल sidebar ordering engine को feed
करते हैं — हर entry एक `group` path और एक वैकल्पिक `order` ढोती है।
[Structure your sidebar](/guides/structure-your-sidebar) पूरे model को कवर करता है:
nested `/`-paths, leaf-vs-branch ordering, `clubSidebarItems`, `sectionOrder`,
`docGroups`, और `menu`। यह page केवल tag syntax है; वह page बताता है कि टुकड़े
कैसे जुड़ते हैं।

## ये भी देखें

- [Structure your sidebar](/guides/structure-your-sidebar) — पूरा sidebar
  ordering model।
- [Embeds & live demos](/guides/embeds) — `@iframe` config grammar पूरी तरह।
- [Configuration](/theme/configuration) — `sectionOrder`, `docGroups`, और साथी।
- [Build a guides site](/guides/build-a-guides-site) — guide-page frontmatter
  (`group` / `order`), इन tags का prose समकक्ष।
