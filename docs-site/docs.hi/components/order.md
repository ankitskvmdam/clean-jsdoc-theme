---
title: "@order"
group: Components
order: 7
---

# `@order` — किसी भी symbol को उसके group के भीतर क्रमबद्ध करें

`@order N` किसी भी symbol के लिए एक स्वतंत्र **within-group sort key** है। inline
[`@category … order=`](/components/category#inline-order) केवल उस symbol पर लागू
होता है जिसके पास एक `@category` **हो**; `@order` किसी ऐसे symbol पर भी काम करता है
जो अपने सादे **kind section** में रहता है — एक `@module`, `@class`, `@namespace`,
इत्यादि जिसके पास कोई category न हो:

```ts
/**
 * @module config
 * @order 1
 */
```

अब `config` **Modules** section में modules के बीच सबसे पहले क्रमबद्ध होता है,
alphabetical क्रम पर fallback करने के बजाय।

> [!IMPORTANT]
> `@order` एक unknown tag है — अपने `jsdoc.json` में
> `tags.allowUnknownTags: true` सेट करें वरना JSDoc उसे छील देता है। देखें
> [overview](/components/overview)। (TypeDoc को किसी flag की ज़रूरत नहीं।)

## कब किसे उपयोग करें

| Situation | Use |
| --- | --- |
| The symbol has a `@category` | `order=N` **inline** on that `@category` |
| The symbol sits in its kind section (no category) | the standalone `@order N` |
| The symbol has both | both are read — see precedence below |

एक **अनुपस्थित या non-numeric** मान undefined छोड़ दिया जाता है, इसलिए symbol
**अंत में** क्रमबद्ध होता है (alphabetically)। `@order` को
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में `readOrder` द्वारा पढ़ा जाता है।

## Precedence: `@category … order=` जीतता है

जब किसी symbol के पास **दोनों** एक `@category … order=` option **और** एक स्वतंत्र
`@order` हों, तो inline `@category` order **जीतता है** — यह अधिक विशिष्ट, सह-स्थित
declaration है। हल किया गया मान `renderContainerPage` में
`category?.order ?? readOrder(doclet)` के रूप में परिकलित होता है, और दोनों उसी
`frontmatter.order` को feed करते हैं जिसे sidebar पढ़ता है।

```ts
/**
 * `order=1` (from @category) wins; the `@order 9` below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

तो स्वतंत्र `@order` की ओर ठीक तभी बढ़ें जब किसी `order=` को टाँगने के लिए **कोई**
category न हो।

## prose समकक्ष

किसी guide page (prose) पर, समतुल्य है **`order` frontmatter** field, जो page को
उसके `group` के भीतर ठीक वैसे ही क्रमबद्ध करता है जैसे `@order` किसी symbol को —
देखें [Build a guides site](/guides/build-a-guides-site)।

## ये भी देखें

- [Components overview](/components/overview) — पूरी tag सूची +
  `allowUnknownTags`।
- [`@category`](/components/category) — grouping (और inline `order=`)।
- [Structure your sidebar](/guides/structure-your-sidebar) — पूरा ordering model।
