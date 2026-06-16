---
title: Callouts
group: Components
order: 2
---

# Callouts

> [!NOTE]
> **यह कहाँ काम करता है — prose और API docs.** आप callouts किसी भी prose (README,
> tutorials, docs directory) में लिख सकते हैं, और theme आपके source के
> `@deprecated` doc-comment tag से भी अपने-आप एक callout उत्सर्जित करता है।

Callouts टाइप किए हुए, रंगीन सूचना-बॉक्स होते हैं — वैसे ही जैसे आप किसी tip,
warning, या किसी ज़रूरी टिप्पणी के लिए इस्तेमाल करते हैं। आप इन्हें **GitHub-style
alert blockquotes** के रूप में लिखते हैं: एक सामान्य blockquote जिसकी पहली पंक्ति
एक `[!TYPE]` marker हो।

यह theme द्वारा render की जाने वाली किसी भी prose में काम करता है — आपका README,
tutorials, और docs directory — क्योंकि यह promotion साझा HTML normalization pass
के दौरान
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
में होती है।

## Syntax

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming.
```

इस तरह render होता है:

> [!NOTE]
> Useful information that users should know, even when skimming.

Marker blockquote के अंदर सबसे पहली चीज़ होनी चाहिए (`blockquoteToCallout`
इसे पहले text node से पढ़ता है और `^\s*\[!(\w+)\]\s*` से मिलान करता है)। Marker
को body से हटा दिया जाता है; उसके बाद की हर चीज़ callout content बन जाती है। एक
अनुपस्थित या अपरिचित marker blockquote को एक सामान्य quote के रूप में छोड़ देता है।

## चार variants और उनके markers

ठीक **चार** callout variants हैं — `info`, `tip`, `warning`, और `error`। कई
GitHub-style keywords इनमें से प्रत्येक पर मुड़ जाते हैं। यह
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
का पूरा `CALLOUT_ALERTS` map है; marker **case-insensitive** होता है (lookup से
पहले इसे lower-case कर दिया जाता है):

| Marker you write | Variant |
| ---------------- | ------- |
| `[!INFO]`        | info    |
| `[!NOTE]`        | info    |
| `[!IMPORTANT]`   | info    |
| `[!TIP]`         | tip     |
| `[!SUCCESS]`     | tip     |
| `[!WARNING]`     | warning |
| `[!CAUTION]`     | warning |
| `[!ERROR]`       | error   |
| `[!DANGER]`      | error   |

तो `[!NOTE]` और `[!IMPORTANT]` दोनों नीला **info** बॉक्स बनाते हैं, `[!TIP]`
और `[!SUCCESS]` हरा **tip** बॉक्स, `[!WARNING]` और `[!CAUTION]` **warning**, और
`[!ERROR]` तथा `[!DANGER]` **error**। कोई अलग "caution" या "danger" रंग नहीं है —
ये warning और error पर alias होते हैं।

## हर variant, rendered रूप में

### Info — `[!INFO]`, `[!NOTE]`, `[!IMPORTANT]`

```markdown
> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.
```

> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.

### Tip — `[!TIP]`, `[!SUCCESS]`

```markdown
> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.
```

> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.

### Warning — `[!WARNING]`, `[!CAUTION]`

```markdown
> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.
```

> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.

### Error — `[!ERROR]`, `[!DANGER]`

```markdown
> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.
```

> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.

## समृद्ध content और nesting

Body सामान्य Markdown होता है — paragraphs, lists, code, links — और callouts
**किसी भी गहराई** पर promote होते हैं, list items के अंदर भी, ठीक वैसे ही जैसे
GitHub lists में nested alerts को render करता है (`promoteCallouts` children के
भीतर पुनरावर्ती रूप से चलता है):

```markdown
> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```
```

> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```

## doc-comment tags से Callouts

Callouts केवल एक prose सुविधा नहीं हैं। जब आप किसी symbol को **`@deprecated`** के
साथ document करते हैं, तो theme अपने-आप एक callout उत्सर्जित करता है — किसी marker
की ज़रूरत नहीं।
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
में `deprecationBlock` देखें:

```js
/**
 * @deprecated Use {@link newApi} instead.
 */
```

बिना किसी कारण वाला एक सादा `@deprecated` एक kind-aware default वाक्य पर लौट आता
है ("This method is deprecated and should not be used."), ताकि बॉक्स कभी खाली न
रहे।

आप **alert markers को स्वयं** सीधे किसी description में भी लिख सकते हैं — वे ठीक
उसी तरह promote होते हैं जैसे prose में:

````js
/**
 * Cache statistics.
 *
 * > [!INFO]
 * > Counts reset when you call `clear()`.
 *
 * > [!WARNING]
 * > `get()` mutates recency — avoid it in hot loops.
 */
````

> [!TIP]
> live demo के **[sample-api module page](/api-docs/module/sample-api)** पर एक
> असली `@module` comment में लिखा गया एक `[!INFO]` callout देखें — source
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> में है।

## पर्दे के पीछे

एक callout को एक capitalized `<Callout type="…">` MDX JSX node के रूप में
उत्सर्जित किया जाता है
([`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
में `callout` builder)। rang
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
में `Callout` → `MdxBlockquote` register करता है, इसलिए एक callout और एक सादा
markdown blockquote एक ही component साझा करते हैं — यह `type` set होने पर बस typed
styling की ओर शाखा बना लेता है। यह capitalized नाम ही वह चीज़ है जो variant को
dwar तक serialization के दौरान बचाए रखती है (एक सादा `>` quote इसे नहीं ढो सकता)।

## ये भी देखें

- [Steps](/components/steps) और [Tabs](/components/tabs) — अन्य prose authoring
  containers।
- [Embeds & live demos](/guides/embeds) — `<Embed>` / `@iframe` के लिए।
- [Custom tags](/components/overview) — `@category`, `@order`, और `@iframe` के लिए।
