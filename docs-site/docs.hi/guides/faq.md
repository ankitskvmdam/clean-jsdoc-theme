---
title: FAQ
group: Guides
order: 8
---

# FAQ

उन सवालों के संक्षिप्त, व्यावहारिक उत्तर जो सबसे अधिक उठते हैं — live content
embed करना, समृद्ध doc comments लिखना, और कुछ सामान्य configuration समायोजन।
प्रत्येक नुस्खा पूरी जानकारी वाले page से link करता है।

## Live content embed करना

theme किसी भी page में एक sandboxed `<iframe>` डाल सकता है — एक CodePen, एक
YouTube video, एक StackBlitz, या कोई भी साइट। इसे लिखने के दो तरीके हैं, और वे
[एक config grammar](/components/embeds) साझा करते हैं:

- **prose में** (README, guides, `docs` folder) — एक ` ```iframe ` fenced block।
- **एक doc comment में** — `@iframe <url> key=value` block tag।

पहला token URL है; बाकी `key=value` options हैं — `title`, `height` (px),
`aspectRatio` (जैसे `16/9`), `width`, `allow`, `sandbox`, `clickToLoad`, और
`themed`। केवल **`https://`** (या protocol-relative `//`) URLs स्वीकार किए जाते
हैं।

### मैं एक CodePen कैसे embed करूँ?

pen का **embed** URL उपयोग करें (`https://codepen.io/USER/embed/PEN_ID`):

````md
```iframe
https://codepen.io/USER/embed/PEN_ID title="CodePen demo" height=400
```
````

> [!TIP]
> CodePen पर, **Embed** खोलें और `<iframe src="…">` snippet से URL copy करें।
> पाठक के click करने तक एक हल्का poster दिखाने के लिए `clickToLoad=true` जोड़ें।

### मैं पाठकों को किसी example को CodePen / JSFiddle / CodeSandbox में कैसे खुलवाऊँ?

`@iframe` URL से एक **मौजूदा** pen embed करता है। किसी **`@example` के code** को
खोलने के लिए — पहले से भरा हुआ, बिना किसी pen के — इसके बजाय **playground** feature
उपयोग करें: इसे `opts.playground` में चालू करें, फिर example को `@playground` से tag
करें:

```js
/**
 * @example
 * const out = resize(img, 200);
 * @playground codepen jsfiddle filename=resize.js highlight=1
 */
export function resize(img, width) {}
```

code block के header में एक **"Open Code in"** dropdown (CodePen / JSFiddle /
CodeSandbox) आ जाता है, सब client-side — कोई API key नहीं। यह prose में भी काम
करता है (एक ` ```js playground ` fence या एक `<playground>` block)। पूरा
walkthrough: [Add a playground](/components/playground)। (`@playground` को
`tags.allowUnknownTags: true` चाहिए, ठीक `@iframe` की तरह।)

### मैं एक YouTube video कैसे embed करूँ?

**embed** URL (`https://www.youtube.com/embed/VIDEO_ID`) उपयोग करें और इसे एक
निश्चित height के बजाय 16/9 aspect ratio दें:

````md
```iframe
https://www.youtube.com/embed/VIDEO_ID title="Intro video" aspectRatio=16/9
```
````

### मैं कोई अन्य website कैसे embed करूँ?

कोई भी `https://` URL काम करता है — pixels में एक `height` या एक `aspectRatio`
सेट करें:

````md
```iframe
https://example.com title="Live preview" height=480
```
````

### मैं एक JSDoc / TypeDoc comment से कैसे embed करूँ?

`@iframe` block tag उपयोग करें — यह symbol के `@example` के बाद render होता है:

```js
/**
 * Renders the chart.
 *
 * @iframe https://codepen.io/USER/embed/PEN_ID title="Demo" height=400
 */
export function render() {}
```

> [!IMPORTANT]
> base JSDoc के लिए `@iframe` एक **unknown tag** है — अपने `jsdoc.json` में
> `tags.allowUnknownTags: true` सेट करें, अन्यथा JSDoc theme के चलने से पहले उसे
> छील देता है। (TypeDoc को ऐसे किसी flag की ज़रूरत नहीं।)

### मेरा embed नहीं दिख रहा — क्या गलत है?

- URL **`https://`** (या `//`) से शुरू होना चाहिए। सादा `http://` या एक relative
  path अस्वीकार किया जाता है, और embed चुपचाप गिरा दिया जाता है।
- अज्ञात option keys एक build चेतावनी के साथ अनदेखी की जाती हैं — ऊपर की सूची के
  विरुद्ध spelling जाँचें।

### क्या मैं इसे तुरंत के बजाय click पर load करा सकता हूँ?

`clickToLoad=true` जोड़ें: पाठक एक poster बटन देखता है (एक `<noscript>` fallback
के साथ) और iframe click पर load होता है। default रूप से यह तुरंत load होता है और
बिना किसी JavaScript के काम करता है।

### क्या embeds light / dark theme का अनुसरण करते हैं?

default रूप से, हाँ — theme बदलने पर embed URL दोबारा हल किया जाता है (एक `{theme}`
token swap किया जाता है, या `?theme-id=<theme>` जोड़ा जाता है)। `themed=false` के
साथ बाहर निकलें। पूर्ण reference: [Embeds & live demos](/components/embeds)।

## समृद्ध doc comments

theme prose में जो कुछ भी करता है, वह आपके **JSDoc / TypeDoc descriptions के
अंदर** भी काम करता है — वे उसी converter से बहते हैं।

### मैं एक comment में callout कैसे जोड़ूँ?

description में ही एक GitHub-style alert blockquote लिखें:

```js
/**
 * Connects to the database.
 *
 * > [!WARNING]
 * > Call `close()` when you're done — connections are not pooled.
 */
export function connect() {}
```

markers चार styles में मैप होते हैं: `[!NOTE]` / `[!INFO]` / `[!IMPORTANT]` →
info, `[!TIP]` / `[!SUCCESS]` → tip, `[!WARNING]` / `[!CAUTION]` → warning, और
`[!ERROR]` / `[!DANGER]` → error। देखें [Callouts](/components/callouts)।

### क्या मैं एक comment में steps या tabs उपयोग कर सकता हूँ?

हाँ — वही `<steps>` (और `<tabs>`) markup एक description में काम करता है; कोई
समर्पित tag नहीं है, आप markup सीधे लिखते हैं:

`````js
/**
 * @module my-api
 *
 * <steps>
 *
 * <step label="Install">
 *
 * ```sh
 * npm install my-api
 * ```
 *
 * </step>
 *
 * <step label="Use">
 *
 * ```js
 * import { go } from 'my-api';
 * ```
 *
 * </step>
 *
 * </steps>
 */
`````

पूर्ण syntax और blank-line नियम के लिए देखें [Steps](/components/steps) और
[Tabs](/components/tabs), और इसे render होते देखने के लिए live
[sample-api module page](/api-docs/module/sample-api)।

### deprecation notices के बारे में क्या?

बस `@deprecated` उपयोग करें — theme इसे अपने आप एक callout के रूप में render करता
है, किसी marker की ज़रूरत नहीं:

```js
/**
 * @deprecated Use {@link connect} instead.
 */
```

## Configuration समायोजन

### मैं site-name text के बजाय एक logo कैसे उपयोग करूँ?

`siteName` को `light` / `dark` image paths वाले एक logo object पर सेट करें (और एक
`alt` fallback) — देखें [`siteName`](/theme/configuration#sitename)।

### मैं sidebar grouping और क्रम को कैसे नियंत्रित करूँ?

symbols पर `@category` / `@order`, guide pages पर frontmatter `group` / `order`,
और `sectionOrder` option उपयोग करें। [Structure your
sidebar](/guides/structure-your-sidebar) हर लीवर को कवर करता है।

### मेरे `@category` / `@order` / `@playground` / `@iframe` tags काम नहीं कर रहे

सबसे संभावित कारण: आपके `jsdoc.json` में **`tags.allowUnknownTags` `true` नहीं
है**। ये सभी ऐसे tags हैं जिन्हें आधार JSDoc परिभाषित नहीं करता, इसलिए वह
**theme के चलने से पहले इन्हें छील देता है** — आपकी categories default kind sections
में सिमट जाती हैं, `@order` कुछ नहीं करता, और `@playground` / `@iframe` कभी render
नहीं होते। flag सेट करें:

```json
{ "tags": { "allowUnknownTags": true } }
```

(TypeDoc पर ऐसी कोई पाबंदी नहीं — यह इन्हें पास-थ्रू कर देता है।) पूरी सूची के लिए
देखें [Custom tags](/components/overview)।

### मैं API reference के बगल में हाथ से लिखे guides कैसे जोड़ूँ?

`opts.docs` को Markdown के एक folder की ओर इंगित करें। देखें [Build a guides
site](/guides/build-a-guides-site) और [Combine guides +
API](/guides/combine-guides-and-api)।

### मैं एक favicon कैसे सेट करूँ?

[`favicon`](/theme/configuration#favicon) को किसी image file की ओर इंगित करें।
theme इसे एक content-hashed asset में copy करता है और हर page के `<head>` में एक
`<link rel="icon">` जोड़ता है:

```json5
opts: { favicon: "./assets/logo.svg" }
```

एक **SVG** favicon उपयोग करने का यही तरीका है — browsers केवल एक root
`favicon.ico` को auto-discover करते हैं, कभी किसी SVG को नहीं, इसलिए इसे theme द्वारा
emit किए गए `<link>` की ज़रूरत होती है। (एक SVG अपने अंदर एक
`@media (prefers-color-scheme: dark)` block के ज़रिये light/dark के अनुसार ढल भी
सकता है।) v4 का `favicon` option v5 की शुरुआत में थोड़े समय के लिए हटा दिया गया था
और वापस आ गया है।

### मैं "copy page" / "open in LLM" बटन कैसे बंद करूँ?

इसे [`copyPage`](/theme/configuration#copypage) के साथ configure या disable करें।

### मेरा build किसी unknown option के बारे में चेतावनी क्यों देता है?

अज्ञात या गलत spelling वाले options default रूप से **चेतावनी** देते हैं (एक "did
you mean?" संकेत के साथ) और build जारी रहता है। उन चेतावनियों को errors में बदलने
के लिए [`strict`](/theme/configuration#strict) सेट करें।

## Localization

### मैं एक localized (बहु-भाषी) साइट कैसे बनाऊँ?

अपनी भाषाओं को उसी `opts` block में घोषित करें और build को `clean-jsdoc` CLI (the
`@clean-jsdoc-theme/aadesh` package) से चलाएँ:

```json
{
  "opts": {
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" }
    ],
    "defaultLocale": "en"
  }
}
```

```sh
npm i -D @clean-jsdoc-theme/aadesh
clean-jsdoc i18n extract    # build the per-locale translation catalogs
# …translate the JSON (or `clean-jsdoc i18n prompt` for an LLM prompt)…
clean-jsdoc build      # render one static site per locale
```

आपको प्रति भाषा एक साइट मिलती है (default root पर, बाकी `/<locale>` के अंतर्गत),
एक header language switcher, और `hreflang` tags। Prose file के अनुसार localized
होता है — एक `README.<locale>.md` home page और एक `docs.<locale>/` overlay — और
प्रति locale fonts `"ja:heading"`-style keys के ज़रिए। पूरी walkthrough
[Localize your docs](/guides/localize-your-docs) में है।

## LLMs के साथ काम करना

### मैं development के लिए एक LLM उपयोग करता हूँ — मैं clean-jsdoc-theme से सबसे अधिक कैसे पाऊँ?

clean-jsdoc-theme को **LLM-friendly** होने के लिए बनाया गया है, दो दिशाओं में:

- **आपकी generated साइट AI द्वारा पठनीय है।** हर page एक साथी (companion) Markdown
  file (`<page>/index.md`) emit करता है, और एक प्रति-page **copy / open-in-LLM**
  बटन साफ़ `.md` को सीधे Claude / ChatGPT / Perplexity को सौंप देता है — तो एक
  सहायक ठीक वही reference पढ़ता है जो आपके users पढ़ते हैं। handoff को
  [`copyPage`](/theme/configuration#copypage) और
  [`aiPrompt`](/theme/configuration#aiprompt) से ट्यून करें।
- **theme को सेट करना स्वयं AI-सहायित है।** एक डाउनलोड करने योग्य
  [**skill**](/theme/llm-skill) है जो किसी भी coding assistant को एक
  clean-jsdoc-theme विशेषज्ञ बना देती है — अपने agent को इसकी ओर इंगित करें और वह
  आपका `jsdoc.json`/`typedoc.json` लिख सकता है, callouts/steps/tabs के साथ guides
  लिख सकता है, sidebar संरचित कर सकता है, cross-links जोड़ सकता है, localization
  सेट कर सकता है, और एक build debug कर सकता है, सब अटकलबाज़ी के बजाय
  source-सत्यापित ज्ञान से। skill folder को अपने assistant में डालें (जैसे
  `.claude/skills/`) और बस जो चाहें माँग लें।

तो चाहे LLM आपके docs **पढ़ रहा** हो या उन्हें **बना रहा** हो, आपको अनुवाद नहीं
करना पड़ता — इसे साथी `.md` और skill की ओर इंगित करें।
