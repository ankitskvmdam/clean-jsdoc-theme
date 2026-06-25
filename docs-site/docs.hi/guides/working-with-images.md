---
title: Images के साथ काम करना
group: Guides
order: 6
---

# Images के साथ काम करना

अपनी documentation में कहीं से भी एक local image को reference करें — एक docs page,
एक tutorial, आपका README, या एक JSDoc / TypeScript doc comment — और theme उस file
को बने हुए साइट में copy कर देता है और link को आपके लिए rewrite कर देता है। output
में हाथ से file copy करने की ज़रूरत नहीं, किसी absolute URL की ज़रूरत नहीं।

नीचे दिया गया diagram इस साइट के `assets/` folder में एक local SVG है, जिसे एक
root-relative path से reference किया गया है:

![The clean-jsdoc-theme build pipeline](/assets/build-pipeline.svg)

> [!TIP]
> यही page इसका जीता-जागता उदाहरण है — इसका source
> [`docs-site/docs/guides/working-with-images.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/docs/guides/working-with-images.md)
> है।

## यह कहाँ काम करता है

Local image resolution हर उस prose source पर लागू होता है जिसे theme render करता है:

- **Docs pages** (`opts.docs`) — वे Markdown/HTML files जो इस जैसी साइट बनाती हैं।
- **Tutorials** (`--tutorials`) — JSDoc का tutorial tree।
- **README** — project का README जो आपका home page बनता है।
- **API comments** — किसी JSDoc या TypeScript doc comment (एक class / function /
  method description) में लिखी गई image।

हर मामले में आप एक सामान्य Markdown image (या एक raw `<img>` tag) लिखते हैं और बाकी
सब theme संभाल लेता है — configure करने के लिए कुछ नहीं है।

## एक path कैसे resolve होता है

आप जो `src` लिखते हैं उसे उस file के सापेक्ष resolve किया जाता है जिसमें वह दिखता है:

| आप जो `src` लिखते हैं | किसके सापेक्ष resolve होता है |
| --- | --- |
| एक relative path (`./img/x.svg`, `../img/x.svg`) | source file की अपनी directory |
| एक root-relative path (`/assets/x.svg`) | आपका project root |
| एक `http(s)://…` URL या एक `data:` URI | अछूता छोड़ दिया जाता है (external) |

तो एक docs page अपने ही folder के सापेक्ष resolve होता है, एक tutorial tutorials
directory के सापेक्ष, README project root के सापेक्ष, और एक API comment उस **source
file के सापेक्ष जिसमें comment रहता है**।

एक resolve हुई image को `_assets/<name>.<hash>.<ext>` पर एक **content-hashed** नाम
के तहत copy किया जाता है (builds के बीच स्थिर, बदलने पर cache-busting) और reference
को उस पर point करने के लिए rewrite कर दिया जाता है। एक raw HTML `<img src="…">` को
बिल्कुल एक Markdown `![](…)` की तरह ही संभाला जाता है।

## JSDoc / TypeScript comment में

API reference images कोई विशेष मामला नहीं हैं — एक doc comment में सीधे एक Markdown
image लिखें और वह **उस source file के सापेक्ष resolve होती है जिसमें comment रहता
है**, फिर किसी भी अन्य image की तरह `_assets/` में hash हो जाती है:

```js
/**
 * Processes a data stream and emits the running total.
 *
 * ![Data flow](../img/data-flow.svg)
 *
 * @param {string[]} data - The items to process.
 * @returns {Promise<number>} The processed count.
 */
async function process(data) { /* … */ }
```

JSDoc का `plugins/markdown` इसे theme के comment देखने से पहले ही एक `<img>` में
render कर देता है, और TypeDoc के doc comments भी इसी तरह काम करते हैं।

## JSDoc `staticFiles`

JSDoc में static assets के एक folder को ship करने का एक standard option है —
`templates.default.staticFiles.include` — जहाँ files output root पर पहुँचती हैं और
आप उन्हें उनके **सादे नाम** (`![diagram](classes-io.png)`) से reference करते हैं,
आम तौर पर `resources/doc/img` जैसी directory से:

```json5
// jsdoc.json
templates: { default: { staticFiles: { include: ["resources/doc/img"] } } }
```

theme इस convention का पालन करता है: आप वहाँ जितनी भी directories सूचीबद्ध करते
हैं, हर एक एक **fallback search root** बन जाती है, इसलिए एक सादा (या root-relative)
image reference resolve होकर ऊपर बताए गए उसी content-hashed `_assets/` pipeline से
होकर गुज़रता है — आपको मौजूदा comments या tutorials को relative paths में फिर से
लिखने की ज़रूरत नहीं। उन directories में मौजूद कोई भी **non-image** files (एक
`.puml` source, एक PDF, …) फिर भी site root पर **verbatim** copy की जाती हैं, जो
JSDoc के व्यवहार से मेल खाता है; जिस image को pipeline ने पहले ही `_assets/` से
serve कर दिया है, उसे root पर दोबारा copy नहीं किया जाता।

> [!NOTE]
> `staticFiles` एक JSDoc option है। TypeDoc के साथ, अपनी images को source के पास
> या अपने `docs` folder में रखें और उन्हें एक relative या root-relative path से
> reference करें — वे उसी `_assets/` pipeline से होकर गुज़रती हैं।

## SVGs theme-aware होती हैं

`.svg` files को एक अतिरिक्त कदम मिलता है: उनके markup को `<img>` के ज़रिए load करने
के बजाय सीधे page में **inline** कर दिया जाता है। इससे एक SVG की अपनी
`[data-theme="dark"]` styles (या एक `currentColor` fill) in-page theme toggle का
अनुसरण कर पाती हैं — एक `<img>` से load हुई SVG केवल operating system की color
scheme देख सकती है, कभी आपकी साइट का toggle नहीं। इस page को light और dark के बीच
toggle करें: ऊपर दिया गया diagram उसी के साथ अपना रंग बदल लेता है।

## Code उदाहरण सुरक्षित हैं

**उदाहरण के तौर पर** दिखाई गई image syntax — एक inline `code span` या एक fenced
block के अंदर — बिल्कुल वैसी ही छोड़ दी जाती है जैसी लिखी गई है; केवल prose में
मौजूद असली images ही copy और rewrite होती हैं। इसीलिए इस page पर हर `![…](…)`
snippet `_assets/` link में बदलने के बजाय literally render होता है।

## आगे

- [Configuration → How assets are handled](/theme/configuration#how-assets-are-handled)
  — अंदरूनी asset pipeline, जो logos और custom CSS/JS के साथ साझा है।
- [Build a guides site](/guides/build-a-guides-site) — वह prose-first workflow
  जिससे यह साइट बनी है।
