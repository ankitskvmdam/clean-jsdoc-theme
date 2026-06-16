---
title: Tabs
group: Components
order: 4
---

# Tabs

> [!NOTE]
> **यह कहाँ काम करता है — prose और source comments.** `<tabs>` markup किसी भी
> prose (README, tutorials, docs directory) में लिखें **या** सीधे किसी JSDoc /
> TypeDoc comment **description** में — दोनों एक ही converter से होकर बहते हैं।
> कोई समर्पित block tag नहीं है; आप दोनों जगह वही markup लिखते हैं।

`<tabs>` एक tabbed view render करता है — clickable tab buttons की एक पंक्ति
panels के एक समूह के ऊपर, एक समय में एक panel दिखाते हुए। आप अपनी prose में (या
किसी doc-comment description में) lowercase `<tabs>` / `<tab>` tags लिखते हैं;
theme इन्हें capitalized `<Tabs>` / `<Tab>` components में फिर से लिखता है जिन्हें
rang render करता है।

यह पुनर्लेखन raw-string स्तर पर
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
में होता है (`splitContainers` / `parseItems`), HTML round-trip से पहले जो इन
custom tags को हटा देता। Component
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
में है।

> [!TIP]
> tabs को live देखना चाहते हैं? पूरा [Configuration](/theme/configuration) page
> इन्हीं से बना है — हर option का snippet एक synced JSDoc/TypeDoc tab group है।
> [JSDoc](/theme/jsdoc-getting-started) और [TypeDoc](/theme/typedoc-getting-started)
> getting-started pages भी इनका उपयोग करती हैं। किसी असली, copy करने योग्य
> उदाहरण के लिए इनमें से किसी के page sources GitHub पर देखें।

## Syntax

एक `<tabs>` container एक या अधिक `<tab>` items को लपेटता है, प्रत्येक में एक
`label`:

````markdown
<tabs>

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

> [!IMPORTANT]
> प्रत्येक tab के भीतरी content (fenced code, lists, paragraphs) के **चारों ओर
> एक खाली पंक्ति** छोड़ें। हर item की body को Markdown के रूप में फिर से parse किया
> जाता है, इसलिए वे खाली पंक्तियाँ ही content को सही ढंग से render होने देती हैं।

## Attributes

| Tag      | Attribute | Effect |
| -------- | --------- | ------ |
| `<tab>`  | `label`   | The tab button text. Falls back to `Tab N` when omitted. |
| `<tab>`  | `value`   | The cross-block **sync key** (see below). Defaults to the normalized label (lower-cased, trimmed). |
| `<tabs>` | `group`   | Opts the whole block into cross-block syncing under a shared group name. |

`readAttr` single या double quotes स्वीकार करता है। किसी `<tabs>` के बाहर का एक
`<tab>` कुछ भी render नहीं करता — `Tab` एक तार्किक marker है जिसे `Tabs` सीधे
पढ़ता है।

Tab bar पूरी तरह SSR-rendered है (पहला tab दिखाई देता है, बाकी `hidden`), एक असली
ARIA tablist + panels के साथ। एक छोटा `tabs` island उस markup को केवल **बढ़ाता**
है — यह click और keyboard nav पर `aria-selected` / `tabIndex` / `hidden` को
toggle करता है। यह panels को Preact के माध्यम से फिर से render नहीं करता, इसलिए
panel content मनमाना rendered MDX हो सकता है।

## page भर में tab groups को sync करना — `group`

कई `<tabs>` blocks को वही `group` दें और वे sync होते हैं: एक को switch करने पर
page पर हर दूसरा grouped block switch हो जाता है (प्रत्येक tab के `value` से
मिलान किया जाता है), और चुनाव अगली बार तक बना रहता है।

`value` वह key है जिस पर किसी group के भीतर tabs मिलाए जाते हैं। जब आप इसे छोड़ देते
हैं, तो यह normalized label पर default हो जाता है (lower-cased और trimmed,
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
में `tabValue` के अनुसार), इसलिए **समान labels मुफ्त में sync होते हैं**। जब
labels casing या शब्दावली में भिन्न हों लेकिन फिर भी sync होने चाहिए, तब एक
स्पष्ट `value` set करें।

````markdown
<tabs group="pm">

<tab label="npm" value="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm" value="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

उसी page पर किसी अन्य `<tabs>` block को वही `group` दें, और दोनों lockstep में
बने रहते हैं — एक में एक tab चुनें और हर दूसरा grouped block अनुसरण करता है। यह
ठीक वही mechanism है जिसे [Configuration](/theme/configuration) अपने
JSDoc-बनाम-TypeDoc snippets को sync में रखने के लिए उपयोग करता है: हर option के
tabs `group="tool"` साझा करते हैं, इसलिए एक बार "TypeDoc" चुनने से पूरा page
switch हो जाता है।

## एक doc comment में

`<tabs>` एक JSDoc / TypeDoc **description** में भी काम करता है। live demo के
module page पर install tabs उसके `@module` comment में ही लिखे गए हैं:

`````js
/**
 * Install it with your package manager of choice:
 *
 * <tabs>
 *
 * <tab label="npm">
 *
 * ```sh
 * npm install --save-dev jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="pnpm">
 *
 * ```sh
 * pnpm add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * </tabs>
 *
 * @module sample-api
 */
`````

> [!TIP]
> इन tabs को live demo के
> **[sample-api module page](/api-docs/module/sample-api)** पर rendered देखें —
> source
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> में है।

## ये भी देखें

- [Steps](/components/steps) — सहोदर stepper container (आप किसी step के अंदर tabs
  nest कर सकते हैं)।
- [Callouts](/components/callouts) — `[!NOTE]`-style notices के लिए।
- [Structure your sidebar](/guides/structure-your-sidebar) — guide pages कैसे
  group की जाती हैं इसके लिए।
