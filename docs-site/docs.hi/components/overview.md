---
title: Overview
group: Components
order: 1
---

# Components

वे बुनियादी इकाइयाँ जिनकी ओर आप documentation **लिखते (authoring)** समय बढ़ते हैं —
prose में (आपका README, tutorials, और `docs` files) और JSDoc / TypeDoc doc
comments में। ये दो रूपों में आती हैं:

- **Visual components** — वह markup जिसे आप prose या किसी comment में डालते हैं और
  जो एक समृद्ध UI element के रूप में render होता है (callouts, steppers, tabs, live
  embeds, runnable playgrounds)।
- **Custom tags** — doc-comment block tags जिन्हें आधार JSDoc/TypeDoc परिभाषित नहीं
  करते, जिन्हें theme sidebar को आकार देने या आपके code से live content embed करने
  के लिए पढ़ता है।

## Visual components

prose और doc-comment descriptions के अंदर एक ही तरह लिखे जाते हैं (वे एक ही
converter से बहते हैं):

| Component | What it does | Page |
| --- | --- | --- |
| **Callouts** | Note / tip / warning / error admonitions (GitHub-style `> [!TIP]`). | [Callouts](/components/callouts) |
| **Steps** | A numbered `<steps>` / `<step>` stepper. | [Steps](/components/steps) |
| **Tabs** | A tabbed `<tabs>` / `<tab>` view. | [Tabs](/components/tabs) |
| **Embeds** | A sandboxed `<iframe>` live demo — a ` ```iframe ` fence or the `@iframe` tag. | [Embeds](/components/embeds) |
| **Playgrounds** | "Open in CodePen / JSFiddle / CodeSandbox" from an `@example` or a code fence. | [Playground](/components/playground) |

## Custom tags

वे block tags जिन्हें आधार JSDoc और TypeDoc परिभाषित नहीं करते — theme उन्हें आपके
source comments से पढ़ता है। दो sidebar को आकार देते हैं; दो live content embed करते
हैं (और इनके prose समतुल्य हैं):

| Tag | What it does | Page |
| --- | --- | --- |
| `@category <path> [order=N]` | Put a symbol's page in an explicit sidebar group (and optionally order it). | [@category](/components/category) |
| `@order N` | A standalone within-group sort key for **any** symbol. | [@order](/components/order) |
| `@iframe <url> key=value` | Embed a sandboxed live demo from a source comment. | [Embeds](/components/embeds) |
| `@playground <providers> [filename=] [highlight=]` | Open an `@example` in a live playground. | [Playground](/components/playground) |

### पहले custom tags चालू करें — `allowUnknownTags`

एक **ही** setup कदम है, और यही इन tags के "काम न करने" का सबसे आम कारण है: आधार
JSDoc theme के चलने से **पहले** ही किसी भी ऐसे tag को छील देता है जिसे वह नहीं
पहचानता। अपने `jsdoc.json` में unknown tags चालू करें:

```json
{
  "tags": { "allowUnknownTags": true }
}
```

इसके बिना, `@category` default kind sections में सिमट जाता है, `@order` कुछ नहीं
करता, और `@iframe` / `@playground` कभी render नहीं होते — चुपचाप। इस site का
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
इसे सेट करता है।

> [!NOTE]
> **TypeDoc को ऐसे किसी flag की ज़रूरत नहीं** — यह इन tags को पास-थ्रू कर देता है।
> `allowUnknownTags` की आवश्यकता सिर्फ़ JSDoc के लिए है।

## Tags बनाम prose — अंदर जाने के दो रास्ते

custom tags **source-comment** रूप हैं। जब आप इसके बजाय prose लिख रहे हों (एक
README, एक tutorial, या एक `docs` file), तो वही क्षमताएँ बिना tags के उपलब्ध हैं:

- **`group` / `order` frontmatter** किसी guide page पर `@category` / `@order` को
  प्रतिबिंबित करते हैं (देखें [Build a guides site](/guides/build-a-guides-site))।
- ` ```iframe ` **fence** `@iframe` को प्रतिबिंबित करता है (देखें
  [Embeds](/components/embeds))।
- ` ```js playground ` **fence** और `<playground>` **container** `@playground` को
  प्रतिबिंबित करते हैं (देखें [Playground](/components/playground))।

## ये भी देखें

- [Structure your sidebar](/guides/structure-your-sidebar) — कैसे `@category` /
  `@order` `sectionOrder`, `docGroups`, `clubSidebarItems`, और `menu` के साथ जुड़ते हैं।
- [Embeds](/components/embeds) — पूरा साझा `@iframe` / ` ```iframe `
  config grammar।
- [Playground](/components/playground) — पूरा `@playground` feature:
  `opts.playground`, prose रूप, और प्रति-provider options।
