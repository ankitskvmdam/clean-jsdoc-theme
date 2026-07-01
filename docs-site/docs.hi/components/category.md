---
title: "@category"
group: Components
order: 8
---

# `@category` — sidebar में किसी symbol को group करें

`@category` किसी symbol के generated page को उसके default **kind section**
(Classes, Modules, Namespaces, …) के बजाय एक स्पष्ट sidebar group में रखता है:

```ts
/**
 * @category Core
 */
export class Parser {}
```

अब `Parser` **Classes** के नीचे नहीं, बल्कि एक **Core** group के नीचे रहता है।

> [!IMPORTANT]
> `@category` एक unknown tag है — अपने `jsdoc.json` में
> `tags.allowUnknownTags: true` सेट करें वरना JSDoc theme के चलने से पहले उसे छील
> देता है। देखें [overview](/components/overview)। (TypeDoc को किसी flag की ज़रूरत
> नहीं।)

> [!NOTE]
> यह grouping व्यवहार **JSDoc** sidebar के लिए है। **TypeDoc** flavor के अंतर्गत,
> `@category` अब भी parse होता है पर API sidebar को प्रभावित **नहीं** करता —
> वह sidebar इसके बजाय एक module/folder पदानुक्रम है। देखें
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar)।

## `@group` — TypeDoc का समतुल्य tag

`@group` को `@category` के सिबलिंग (TypeDoc का अपना grouping tag) के रूप में
पहचाना जाता है। वही caveat लागू होती है: यह parse होता है, पर यह भी TypeDoc
API sidebar को आकार नहीं देता — देखें
[The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar)।
आज `@category` / `@group` को TypeDoc sidebar को चलाने देने का कोई opt-in नहीं
है।

## Path grammar

`parseCategory` (in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))
tag text को whitespace पर विभाजित करता है, फिर:

- सादे tokens की **अग्रणी श्रृंखला** ही **group path** है, जो **एकल space से जुड़ी**
  होती है।
- Parsing पहले ऐसे token पर **options** में बदल जाती है जिसमें `=` हो। वहाँ से आगे
  की हर चीज़ `key=value` है।
- एक शाब्दिक **`/`** ही वह चीज़ है जो किसी group को **nest** करती है। Spaces nest
  **नहीं** करते।

### नाम में spaces बने रहते हैं; `/` nest करता है

यह सूक्ष्म हिस्सा है। एक space केवल group नाम का हिस्सा है — केवल `/` एक parent ▸
child सम्बन्ध बनाता है।

```ts
/** @category Getting Started */
export class Intro {}
```

→ एक सपाट group जिसका नाम शाब्दिक रूप से **Getting Started** है (space रखा जाता है)।

```ts
/** @category Core/Parsing */
export class Lexer {}
```

→ page को **Core ▸ Parsing** के नीचे nest करता है।

आप जितना चाहें उतना गहरा nest कर सकते हैं — `@category Core/Parsing/Internals` →
**Core ▸ Parsing ▸ Internals**।

### पहला `@category` जीतता है

अगर किसी symbol के पास एक से अधिक `@category` हों, तो **पहला** उपयोग होता है; बाक़ी
को अनदेखा कर दिया जाता है।

## Inline `order=`

आज `@category` का एकमात्र option `order` है — within-group **sort key**:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}

/** @category Core/Parsing order=2 */
export class Token {}
```

`Lexer` **Core ▸ Parsing** के अंदर `Token` से पहले क्रमबद्ध होता है। path अग्रणी
tokens है; options पहले `=` के बाद आते हैं, इसलिए `Getting Started order=1`
**Getting Started** group है जिसका `order=1` है।

> [!NOTE]
> एक **अनुपस्थित या non-numeric** `order` undefined छोड़ दिया जाता है — तब page
> **अंत में**, alphabetically, क्रमबद्ध होता है, जैसे एक untagged।

## हल किए गए उदाहरण

```ts
/** @category Core */
export class A {}                 // → Core

/** @category Core/Schema order=1 */
export class Point {}             // → Core ▸ Schema, first

/** @category Data Pipeline */
export class Stage {}             // → "Data Pipeline" (one group; space kept)

/** @category Advanced/Internals order=10 */
export class Cache {}             // → Advanced ▸ Internals, order 10
```

## `@order` के साथ संयोजन

`@category` पर inline `order=` और स्वतंत्र [`@order`](/components/order) tag दोनों
उसी sort key को feed करते हैं। जब किसी symbol के पास **दोनों** हों, तो inline
`@category … order=` **जीतता है** — देखें
[`@order` page पर precedence नियम](/components/order#precedence-category--order-wins)।

## यह sidebar को कैसे आकार देता है

`@category` theme के एकल sidebar-ordering engine में एक lever है — हर entry एक
`group` path और एक वैकल्पिक `order` ढोती है। इसका prose समकक्ष किसी guide page का
**`group` frontmatter** है (वही `/`-nesting नियम)। पूरा model — nested paths,
leaf-vs-branch ordering, `clubSidebarItems`, `sectionOrder`, `docGroups`, और
`menu` — [Structure your sidebar](/guides/structure-your-sidebar) में है।

## ये भी देखें

- [Components overview](/components/overview) — पूरी tag सूची +
  `allowUnknownTags`।
- [`@order`](/components/order) — बिना किसी category के symbols को क्रमबद्ध करना।
- [Structure your sidebar](/guides/structure-your-sidebar) — groups + order कैसे जुड़ते हैं।
