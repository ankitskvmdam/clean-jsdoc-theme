---
title: सिंहावलोकन
group: Using the Theme
order: 1
---

# सिंहावलोकन

`clean-jsdoc-theme` किसी **JSDoc** या **TypeDoc** project को एक तेज़, आधुनिक,
LLM-friendly documentation site में बदल देता है। आप इसे अपने source comments पर —
और, वैकल्पिक रूप से, Markdown guides के एक folder पर — इंगित करते हैं, और यह
server-rendered HTML, आलस्य से (lazily) hydrate होने वाले interactive islands,
fuzzy + full-text search, light और dark themes, तथा हर page का एक साथी `.md`
तैयार करता है।

यह कोई एकल template नहीं है। पर्दे के पीछे यह single-responsibility
[packages](/#the-packages) का एक छोटा समूह है जो एक one-way pipeline में जुड़ा है,
ताकि वही core JSDoc और TypeDoc दोनों entry points को शक्ति दे सके।

## यह कैसे काम करता है

<steps>

<step label="Document your code">

JSDoc या TypeDoc comments वैसे ही लिखें जैसे आप सामान्यतः लिखते हैं — वैकल्पिक रूप
से हाथ से लिखे Markdown guides के एक folder के साथ-साथ।

</step>

<step label="Point your tool at the theme">

theme को अपने `jsdoc.json` या `typedoc.json` में जोड़ें। शुरू करने के लिए किसी CSS
या build configuration की ज़रूरत नहीं है।

</step>

<step label="Build">

JSDoc या TypeDoc चलाएँ। theme एक पूर्ण static site बनाता है — HTML, islands, एक
search index, और हर page का एक साथी `.md` — कहीं भी deploy करने के लिए तैयार।

</step>

</steps>

## clean-jsdoc-theme किसे इस्तेमाल करना चाहिए

- **JSDoc users** जो default template के बजाय एक आधुनिक, responsive, searchable
  site चाहते हैं — शुरू करने के लिए किसी CSS या build config की ज़रूरत नहीं।
- **TypeScript / TypeDoc users** जो अपने मौजूदा reflection-आधारित docs से वही
  output चाहते हैं।
- **Library authors** जो हाथ से लिखे Markdown guides और एक auto-generated API
  reference को **एक ही** site, एक sidebar, एक search में रखना चाहते हैं।
- **AI की परवाह करने वाली Teams**, जो चाहती हैं कि हर page एक साफ़-सुथरा साथी `.md`
  ship करे ताकि assistants और LLMs docs को उतनी ही आसानी से पढ़ सकें जितनी आसानी
  से लोग पढ़ते हैं।
- **localization की ज़रूरत वाले Projects**, जो अपने docs कई भाषाओं में ship करना
  चाहते हैं — translated UI, API descriptions, और prose, प्रति locale एक static
  site, साथ में एक language switcher। देखें [अपने docs को localize करें](/guides/localize-your-docs)।

## अपनी राह खोजें

- **शुरुआत** — [JSDoc](/theme/jsdoc-getting-started) या
  [TypeDoc](/theme/typedoc-getting-started): theme install करें और अपनी पहली site बनाएँ।
- **[Configuration](/theme/configuration)** — हर theme option, JSDoc और TypeDoc
  रूपों के साथ-साथ।
- **Guides** — [एक guides site बनाएँ](/guides/build-a-guides-site), एक
  [API reference](/guides/build-an-api-reference),
  [दोनों को मिलाएँ](/guides/combine-guides-and-api), और
  [अपने sidebar की संरचना करें](/guides/structure-your-sidebar)।
- **Authoring** — [callouts](/authoring/callouts), [steps](/authoring/steps),
  [tabs](/authoring/tabs), [embeds](/authoring/embeds), और
  [custom tags](/authoring/custom-tags) जिन्हें आप prose और doc comments में
  इस्तेमाल कर सकते हैं।
- **[Packages](/#the-packages)** — building blocks, अगर आप internals को समझना या
  विस्तृत करना चाहते हैं।

सेट अप करने को तैयार हैं? **[JSDoc Getting Started](/theme/jsdoc-getting-started)** या
**[TypeDoc Getting Started](/theme/typedoc-getting-started)** पर जाएँ।
