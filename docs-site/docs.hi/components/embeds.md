---
title: Embeds
group: Components
order: 3
---

# Embeds & live demos

> [!NOTE]
> **यह कहाँ काम करता है — prose और API docs.** किसी embed को prose में
> ` ```iframe ` fence के साथ लिखें, या किसी source comment से `@iframe` block tag
> के साथ। दोनों एक ही config grammar साझा करते हैं।

एक **embed** एक sandboxed `<iframe>` है — एक CodePen, एक StackBlitz, एक live
demo, एक video। Theme आपको इसे लिखने के दो तरीके देता है, और वे **एक ही config
grammar** साझा करते हैं:

- **prose** में (README, tutorials, docs directory) — एक ` ```iframe ` fenced
  code block;
- **source comments** में — `@iframe <url> key=value` doc-comment block tag।

दोनों
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
में `parseEmbedConfig` से होकर parse होते हैं और एक ही `<Embed>` island बन जाते हैं
([`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx))।

## config grammar

Config एक एकल पंक्ति है (fence body कई पंक्तियों में फैल सकता है, लेकिन tokens
whitespace-delimited होते हैं):

```
<url> key=value key="value with spaces" flag
```

- **पहला** whitespace-delimited token ही **URL** है (आवश्यक)।
- उसके बाद का हर token एक `key=value` जोड़ा है।
- मान single या double quotes में लपेटे जा सकते हैं, और एक quoted मान में spaces हो
  सकते हैं।
- बिना `=` वाला एक सादा token एक `true` flag माना जाता है, लेकिन **केवल** boolean
  keys के लिए; कोई भी अन्य सादा token चेतावनी देता है और अनदेखा कर दिया जाता है।

### URL schemes

सुरक्षा के लिए, `parseEmbedConfig` **केवल** `https://` URLs या
**protocol-relative** `//` URLs स्वीकार करता है। कुछ भी और — `http://`, एक
relative path, एक खाली string, या एक अनुपस्थित URL — parser को `null` लौटाने पर
मजबूर करता है, और embed **हटा दिया जाता है** (parser एक चेतावनी log करता है)।
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
में `src.startsWith('https://') || src.startsWith('//')` जाँच देखें।

### Options

| Key           | Type    | Notes |
| ------------- | ------- | ----- |
| `title`       | string  | iframe title (accessibility) + click-to-load poster label. |
| `width`       | string  | CSS width. Default `100%`. |
| `height`      | number  | Pixels. Default `400` when no `aspectRatio`. A non-numeric value is dropped. |
| `aspectRatio` | string  | e.g. `16/9`. Preferred over `height` when set. |
| `allow`       | string  | iframe `allow=` list, e.g. `"fullscreen; clipboard-write"`. |
| `sandbox`     | string  | Override the default sandbox token list. |
| `clickToLoad` | boolean | Render a click-to-load poster instead of a live iframe. |
| `themed`      | boolean | Sync to the active theme. **On by default** (see below). |

अज्ञात keys चेतावनी देती हैं और अनदेखी कर दी जाती हैं; embed फिर भी render होता है।
Default sandbox `allow-scripts allow-same-origin allow-popups allow-forms` है।

### Theme syncing — `themed` और `{theme}` token

`themed` **default रूप से चालू** है; opt out करने के लिए `themed=false` पास करें।
चालू होने पर, embed हर बार page theme पलटने पर खुद को फिर से इंगित करता है, एक
mechanism को प्राथमिकता-क्रम में चुनते हुए
([`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)
में `resolveSrc`):

1. URL में एक शाब्दिक **`{theme}` token** `light` / `dark` से बदल दिया जाता है;
2. एक author-declared `theme-id` query param अछूता छोड़ दिया जाता है (वह जीतता है);
3. अन्यथा `?theme-id=<theme>` अपने-आप जोड़ दिया जाता है।

तो `https://example.com/demo?ui={theme}` dark mode में `…?ui=dark` बन जाता है।
केवल एक शाब्दिक `themed=false` (case-insensitive) इसे अक्षम करता है — कुछ भी और,
इसे छोड़ देने सहित, इसे चालू रखता है।

## Authoring form 1 — ` ```iframe ` prose fence

किसी भी README / tutorial / docs page में, info string `iframe` के साथ एक fenced
block लिखें। Body ही config है:

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

Fence
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
में `resolveEmbedFences` द्वारा `<Embed>` में lower किया जाता है। एक मान्य config
embed बन जाता है; एक अमान्य config (जैसे एक non-`https` URL) हटा दिया जाता है।
अन्य सभी fences (`js`, `ts`, `sh`, …) अछूते रहते हैं।

यहाँ एक असली, themed embed एक fence से render किया गया है:

```iframe
https://ankdev.me/clean-jsdoc-theme/api-docs/ title="clean-jsdoc-theme API example" height=420
```

## Authoring form 2 — `@iframe` doc-comment tag

Source comments में, `@iframe` block tag का उपयोग करें। वही grammar — पहला token
URL, फिर `key=value`:

```js
/**
 * A live demo of the renderer.
 *
 * @iframe https://example.com/embed/demo title="Renderer demo" aspectRatio=16/9
 */
export function render() {}
```

`@iframe`
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
में `embedBlocks` द्वारा संभाला जाता है। प्रत्येक मान्य `@iframe` एक `<Embed>` बन
जाता है; block symbol के `@example` section के **बाद** render होता है। आप एक
doclet पर एक से अधिक `@iframe` रख सकते हैं।

> [!IMPORTANT]
> `@iframe` एक tag नहीं है जिसे आधार JSDoc जानता हो, इसलिए आपके config को
> `jsdoc.json` में `tags.allowUnknownTags: true` set करना होगा (इस site का
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> ऐसा करता है)। इसके बिना, JSDoc theme के देखने से पहले ही tag हटा देता है।

## पर्दे के पीछे

`parseEmbedConfig` एक `EmbedSpec` बनाता है;
[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
में `embed` builder एक self-closing `<Embed src="…" …/>` MDX JSX node उत्सर्जित
करता है (numbers/booleans stringified, `undefined` fields छोड़ दिए जाते हैं ताकि
component अपने defaults लागू करे)। rang
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
में `Embed` register करता है; component एक `data-island="embed"` marker render
करता है जिसे dwar का loader hydrate करता है। live iframe और click-to-load poster
दोनों **बिना किसी JavaScript** के काम करते हैं (एक `<noscript>` fallback iframe
शामिल है)।

## ये भी देखें

- [Custom tags](/components/overview) — `@category` / `@order` के साथ-साथ
  `@iframe`, और `allowUnknownTags` आवश्यकता।
- [Callouts](/components/callouts), [Steps](/components/steps),
  [Tabs](/components/tabs) — अन्य authoring primitives।
