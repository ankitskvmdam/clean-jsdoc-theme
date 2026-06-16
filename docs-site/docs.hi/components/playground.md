---
title: Playground
group: Components
order: 2
---

# Playground

इस guide में आप पाठकों को docs छोड़े बिना आपके examples चलाने देंगे। **playground**
feature चालू होने पर, किसी code block के header में एक **"Open Code in"** बटन उग
आता है जो code को — पहले से भरा हुआ — **CodePen**, **JSFiddle**, या
**CodeSandbox** में खोलता है। यह सब पाठक के browser में होता है (CodePen/JSFiddle
के लिए एक form `POST`, CodeSandbox के लिए एक parameterized link) — **कोई backend
नहीं, कोई API key नहीं**।

वही `@playground` tag आपको दो प्रस्तुति-स्पर्श भी देता है जो providers के **साथ या
बिना** काम करते हैं: एक **`filename`** header label और line **`highlight`ing**।

## 1. इसे चालू करें

जब तक आप अपने `jsdoc.json` के `opts` में `playground` न जोड़ें, यह feature **बंद**
रहता है। shorthand `true` इसे defaults के साथ चालू कर देता है (हर provider, प्रति
example opt-in); object रूप आपको नियंत्रण देता है:

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  playground: {
    // Turn every @example into a playground (default false → opt-in per tag).
    enableForAllExamples: false,
    // Which providers to offer, in this order (default: all three).
    providers: ["codepen", "jsfiddle", "codesandbox"],
    // Site-wide per-provider options (see "Set provider options" below).
    codepen: { js_pre_processor: "babel", css_external: "https://unpkg.com/some.css" },
    jsfiddle: { resources: "https://unpkg.com/some.js", wrap: "b" },
    codesandbox: { dependencies: { lodash: "latest" } }
  }
}
```

कुछ जानने लायक बातें:

- `playground: false` (या इसे छोड़ देना) output को **byte-समान** रखता है — code
  blocks ठीक पहले जैसे render होते हैं।
- `enableForAllExamples: true` **हर** `@example` को शामिल कर लेता है (एक example
  फिर भी `@playground none` से बाहर निकल सकता है)।
- `providers` default set + क्रम तय करता है। तीनों के लिए इसे छोड़ दें।

## 2. एक example tag करें

किसी doc comment में, एक `@example` के बगल में `@playground` जोड़ें। grammar
whitespace से अलग किए गए tokens की एक सूची है (वही parser जो
[`@iframe`](/components/embeds) उपयोग करता है):

```js
/**
 * Resize an image to a target width.
 *
 * @example
 * const out = resize(img, 200);
 * render(out);
 * @playground codepen jsfiddle filename=resize.js highlight=2
 */
export function resize(img, width) {}
```

| Token | What it does |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | Offer only these providers (your order is kept). |
| *(bare `@playground`)* | Use the default `providers` from `opts.playground`. |
| `none` / `off` | Opt this example **out** (handy with `enableForAllExamples`). |
| `filename=<name>` | Show `<name>` as the header label instead of `CODE`. |
| `highlight=1,4,8` | Highlight lines 1, 4 and 8 (1-based). `highlight=[1,4,8]` also works. |

`filename` और `highlight` `none`/बिना providers के भी लागू होते हैं — तो आप किसी
snippet को label और highlight कर सकते हैं बिना कोई playground दिए ही।

> [!IMPORTANT]
> base JSDoc के लिए `@playground` एक **unknown tag** है, इसलिए अपने `jsdoc.json`
> में `tags.allowUnknownTags: true` सेट करें (वही flag जो `@iframe` को चाहिए) —
> अन्यथा JSDoc theme के चलने से पहले उसे छील देता है। TypeDoc को ऐसे किसी flag की
> ज़रूरत नहीं।

## 3. इसे prose में उपयोग करें

doc comments के बाहर — आपके `docs` folder, tutorials, या README में — दो authoring
रूप हैं, क्योंकि prose जिस तरह process होती है:

**` ```js playground ` fence** `docs` directory और **Markdown** tutorials में काम
करता है। fence info string में language के बाद `playground` (साथ ही कोई भी tokens)
रखें:

````markdown
```js playground codepen filename=demo.js highlight=2
const out = resize(img, 200);
render(out);
```
````

**`<playground>` container** **हर जगह** काम करता है, README और HTML tutorials
सहित। एक अकेले fenced code block को लपेटें:

````markdown
<playground codepen jsfiddle filename="demo.js" highlight="2">

```js
const out = resize(img, 200);
render(out);
```

</playground>
````

> [!TIP]
> **दो रूप क्यों?** किसी fence की language के बाद की info string ("meta") तब गिरा दी
> जाती है जब README/HTML prose को normalize किया जाता है, इसलिए fence रूप सिर्फ़ उन
> sources के लिए काम करता है जो raw Markdown के रूप में आते हैं (`docs`, Markdown
> tutorials)। `<playground>` container उस normalization से बच जाता है, इसलिए README
> में इसी की ओर बढ़ें। भीतरी fence के चारों ओर एक खाली पंक्ति छोड़ें (वही नियम जो
> [`<steps>`/`<tabs>`](/components/steps) का है)।

एक सादा prose `playground` (कोई provider tokens नहीं) **सभी** providers देता है —
prose के पास site-wide `providers` default तक पहुँच नहीं होती।

## 4. Provider options सेट करें

`opts.playground` में प्रति-provider records सीधे हर service के prefill API को पास
किए जाते हैं और site के **हर** playground पर लागू होते हैं:

- **CodePen** — [`/pen/define` prefill](https://blog.codepen.io/documentation/prefill/)
  fields: `js_pre_processor`, `js_external`, `css`, `css_external`, `html`,
  `editors`, `layout`, `title`, … example code pen का JS बन जाता है।
- **JSFiddle** — [post API](https://docs.jsfiddle.net/api/display-a-fiddle-from-post)
  fields: `resources` (comma-separated external URLs), `wrap`, `html`, `css`,
  `title`, `description`।
- **CodeSandbox** — [define API](https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api):
  `dependencies` `package.json` को seed करते हैं; example `index.js` बन जाता है।

header strip या highlighted-line tint को फिर से रंगने के लिए,
[`colors` / `darkColors`](/theme/configuration#colors-and-darkcolors) के नीचे
`codeHeaderBg` / `codeHeaderFg` / `codeHighlightBg` keys सेट करें।

## ये भी देखें

- [Custom tags](/components/overview) — `@iframe` / `@category` / `@order` के साथ
  `@playground`, और `allowUnknownTags` की आवश्यकता।
- [Embeds & live demos](/components/embeds) — किसी **मौजूदा** pen, video, या live
  demo को URL से embed करने के लिए `@iframe` / ` ```iframe `।
