---
title: Steps
group: Components
order: 3
---

# Steps

> [!NOTE]
> **यह कहाँ काम करता है — prose और source comments.** `<steps>` markup किसी भी
> prose (README, tutorials, docs directory) में लिखें **या** सीधे किसी JSDoc /
> TypeDoc comment **description** में — दोनों एक ही converter से होकर बहते हैं।
> कोई समर्पित block tag नहीं है; आप दोनों जगह वही markup लिखते हैं।

`<steps>` एक ऊर्ध्वाधर, क्रमांकित stepper render करता है — वैसा "1, 2, 3"
walkthrough जैसा docs sites install / configure / build flows के लिए इस्तेमाल
करते हैं। आप अपनी prose में (या किसी doc-comment description में) lowercase
`<steps>` / `<step>` tags लिखते हैं; theme इन्हें capitalized `<Steps>` /
`<Step>` components में फिर से लिखता है जिन्हें rang render करता है।

यह पुनर्लेखन raw-string स्तर पर
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
में होता है (`splitContainers` / `parseItems` / `expandContainers`), HTML
round-trip से पहले जो अन्यथा इन custom tags को हटा देता। Components
[`Steps.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
में रहते हैं।

> [!TIP]
> steps को live देखना चाहते हैं? [JSDoc Getting Started](/theme/jsdoc-getting-started)
> और [TypeDoc Getting Started](/theme/typedoc-getting-started) pages अपने install
> walkthroughs को steppers के रूप में रखती हैं — किसी असली, copy करने योग्य
> उदाहरण के लिए दोनों में से किसी page का source GitHub पर देखें।

## Syntax

एक `<steps>` container एक या अधिक `<step>` items को लपेटता है। प्रत्येक step एक
**वैकल्पिक** `label` attribute लेता है — step body के ऊपर दिखाया गया एक bold
heading:

````markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build command and open the output.

</step>

</steps>
````

> [!IMPORTANT]
> प्रत्येक step के भीतरी content (fenced code, lists, paragraphs) के **चारों ओर
> एक खाली पंक्ति** छोड़ें। प्रत्येक step की body को Markdown के रूप में फिर से parse
> किया जाता है (`expandContainers` इसे वापस converter से होकर route करता है),
> इसलिए वे खाली पंक्तियाँ ही content को सही ढंग से parse होने देती हैं।

## Attributes

केवल एक attribute पढ़ा जाता है, और केवल `<step>` पर:

| Tag       | Attribute | Effect |
| --------- | --------- | ------ |
| `<step>`  | `label`   | Optional bold heading above the step body. Omit it for an unlabeled step. |

`readAttr` या तो single या double quotes स्वीकार करता है (`label="…"` या
`label='…'`)। किसी `<steps>` के बाहर का एक `<step>` कुछ भी render नहीं करता —
`Step` एक तार्किक marker है जिसके props को `Steps` सीधे पढ़ता है; एक भटका हुआ
`<step>` markup लीक करने के बजाय `null` लौटाता है।

`Steps` **SSR-only** static markup है — कोई client JavaScript नहीं और कोई
hydration island नहीं। यह विशुद्ध layout है।

## अन्य components को nest करना

किसी step की body को पुनरावर्ती रूप से फिर से parse किया जाता है, इसलिए आप किसी
step के अंदर **callouts**, **tabs**, code blocks, और यहाँ तक कि एक और `<steps>`
nest कर सकते हैं:

````markdown
<steps>

<step label="Choose your package manager">

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

<step label="Heads up">

> [!TIP]
> Callouts work inside steps too.

</step>

</steps>
````

यह वही pattern है जिसे [JSDoc Getting Started](/theme/jsdoc-getting-started)
walkthrough उपयोग करता है — एक `<step>` के अंदर nested एक `<tabs>` block।

## एक असली उदाहरण, एक doc comment में

वही markup एक JSDoc / TypeDoc **description** में काम करता है। यहाँ वह `@module`
comment है जो live demo को चलाता है — `Cache` class का एक तीन-step walkthrough,
एक `<tabs>` install block और एक `[!INFO]` callout के साथ:

`````js
/**
 * A small, fully-documented sample module …
 *
 * > [!INFO]
 * > Everything below is authored inline in the `@module` doc comment.
 *
 * ## Quick start
 *
 * <steps>
 *
 * <step label="Initialize the cache">
 *
 * Create a {@link Cache}, optionally capping how many entries it holds:
 *
 * ```js
 * const cache = new Cache({ maxSize: 2 });
 * ```
 *
 * </step>
 *
 * <step label="Store some values">
 *
 * `set()` returns the cache, so calls chain:
 *
 * ```js
 * cache.set('a', 1).set('b', 2);
 * ```
 *
 * </step>
 *
 * <step label="Read them back">
 *
 * ```js
 * cache.get('a'); // => 1
 * ```
 *
 * </step>
 *
 * </steps>
 *
 * @module sample-api
 */
`````

> [!TIP]
> इसे live API demo के
> **[sample-api module page](/api-docs/module/sample-api)** पर rendered देखें —
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> से हूबहू generated।

## ये भी देखें

- [Tabs](/components/tabs) — सहोदर tabbed-view container।
- [Callouts](/components/callouts) — `[!NOTE]`-style notices के लिए।
- [Build a guides site](/guides/build-a-guides-site) — जहाँ prose pages रहती हैं।
