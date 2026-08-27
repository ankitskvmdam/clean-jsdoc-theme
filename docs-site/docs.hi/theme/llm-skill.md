---
title: LLM के साथ इस्तेमाल
group: Using the Theme
order: 5
---

# LLM के साथ इस्तेमाल

यह theme **LLMs के लिए बनाया गया है** — हर page एक साथी `.md` और एक
"copy / open in Claude · ChatGPT · Perplexity" button ship करता है। यह page उस
कहानी का दूसरा आधा हिस्सा है: एक अकेली, downloadable **skill file** जो *किसी भी*
assistant को सिखाती है कि **`clean-jsdoc-theme` को ख़ुद कैसे इस्तेमाल और विस्तृत
करें**।

यह repo के
[`SKILLS/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS)
folder में
[`SKILLS/clean-jsdoc-theme/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
के रूप में रहती है। इसे अपने coding assistant को सौंप दें और यह अनुमान लगाना बंद कर
देता है — यह theme configure करता है, आपके guides लिखता है, और आपके sidebar को
पहली ही बार सही ढंग से संरचित करता है।

> [!NOTE]
> जैसे-जैसे project बढ़ेगा, `SKILLS/` वह जगह है जहाँ केंद्रित skills रहेंगी (प्रति-package
> skills, "build a guides site", "build an API reference", …)। आज यह umbrella
> `clean-jsdoc-theme` skill ship करता है जो नीचे की हर चीज़ को कवर करती है।

## यह क्या है

`SKILL.md` एक स्वयं-निहित Markdown document है जो पूरे theme को एक ही जगह समेट लेता
है — model की memory के नहीं, source के विरुद्ध verified। यह **agent-skill** format
में लिखा गया है (एक `name` + `description` frontmatter block), इसलिए यह उन agents
में सीधे गिर जाता है जो skills का समर्थन करते हैं, पर यह बस Markdown है: कोई भी LLM
इसे पढ़ सकता है।

यह शुरू से अंत तक यह कवर करती है:

- **Setup** — JSDoc और TypeDoc, न्यूनतम काम करने वाले configs के साथ।
- **हर configuration option** — `opts` / `cleanJsdocTheme` reference, साथ ही
  JSDoc-only `templates.default` वाले।
- **Authoring** — callouts, steps, tabs, embeds, और `@category` / `@order` /
  `@iframe` custom tags, उनके सटीक syntax नियमों के साथ।
- **docs directory और frontmatter** — files कैसे pages बनती हैं।
- **sidebar model** — एकल group/order engine और उसके सारे levers।
- **Cross-references और source links**, **LLM features**, और **theming**।
- **package architecture** (`utils` · `setu` · `rang` · `dwar`) उन सबके लिए जो
  internals विस्तृत करते हैं।
- एक **gotchas और troubleshooting** section उन ग़लतियों के लिए जो assistants सबसे
  अधिक करते हैं।

## यह क्यों मायने रखता है

`clean-jsdoc-theme` default JSDoc template नहीं है, और सामान्य "JSDoc theme" ज्ञान
से काम करने वाला assistant विवरण ग़लत कर देगा — यह भूल जाएगा कि
[`plugins/markdown`](/theme/jsdoc-getting-started) ज़रूरी है, यह चूक जाएगा कि custom
tags को [`allowUnknownTags`](/components/overview) चाहिए, या मान लेगा कि spaces
एक [`@category`](/components/overview) path को nest करते हैं जबकि केवल `/` करता
है।

> [!TIP]
> skill को आगे रखना एक आगे-पीछे की बातचीत ("वह option मौजूद नहीं है…", "इसके बजाय
> यह आज़माएँ…") को एक सही पहले-ही उत्तर में बदल देता है। यह वही विचार है जो साथी
> `.md` के पीछे है जो theme *आपके* docs के लिए emit करता है — model को सच का स्रोत
> पहले दे दें और यह आपके project को उतनी ही धाराप्रवाह पढ़ता है जितना एक व्यक्ति
> पढ़ता है।

## इसे कैसे इस्तेमाल करें

<steps>

<step label="Download it">

skill एक **folder** है —
[`SKILLS/clean-jsdoc-theme/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS/clean-jsdoc-theme) —
एक हल्की `SKILL.md` और माँग-पर (on-demand) `reference/` files (assistant केवल वही
हिस्सा पढ़ता है जो उसे चाहिए)। पूरा folder लें:

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme clean-jsdoc-theme
```

या बस
[GitHub पर `SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
खोलें और उसे copy करें — `SKILL.md` अधिकांश सवालों के लिए स्वयं-पर्याप्त है और बाक़ी
के लिए reference files से link करती है।

</step>

<step label="Give it to your assistant">

जो भी आपके setup से मेल खाए उसे चुनें:

<tabs group="assistant">

<tab label="Claude Code / agents">

यह एक तैयार-इस्तेमाल **skill** है। folder को अपनी project (या user) skills
directory में डालें ताकि agent इसे — और इसकी `reference/` files को — माँग पर load
करे:

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme .claude/skills/clean-jsdoc-theme
```

`name` / `description` frontmatter ही वह है जो agent को तय करने देता है कि इसे कब
लागू करना है; फिर `SKILL.md` प्रति कार्य मेल खाती `reference/` file खींचती है।

</tab>

<tab label="ChatGPT / Claude.ai / Perplexity">

किसी chat की शुरुआत में `SKILL.md` को **attach या paste** करें, फिर अपना सवाल
पूछें:

> _यह clean-jsdoc-theme के लिए skill है। इसका इस्तेमाल करते हुए, एक `typedoc.json`
> सेट करें जो sidebar में मेरे guides को API reference के ऊपर रखे।_

</tab>

<tab label="Cursor / Copilot / Windsurf">

इसे अपने editor के **project rules / context** में जोड़ें — जैसे इसे एक rule file
के रूप में सहेजें (`.cursor/rules/clean-jsdoc-theme.md` या आपके tool का समतुल्य),
या chat में file को `@`-mention करें ताकि यह context में खिंच आए।

</tab>

</tabs>

</step>

<step label="Ask away">

"guides-only site के लिए `jsdoc.json` लिखें" से लेकर "मेरा `@category` दो groups
क्यों दिखा रहा है?" तक — हर चीज़ का अब वह उत्तर मिलता है जो theme के वास्तव में काम
करने के तरीके पर आधारित है।

</step>

</steps>

## इसे अद्यतन रखें

`SKILL.md` code के साथ-साथ versioned है (यह एक `skill-revision` stamp रखती है) और
source के विरुद्ध verified है, इसलिए एक ताज़ा copy हमेशा उस theme से मेल खाती है जिस
पर आप हैं। skill assistant को **updates की जाँच करना भी सिखाती है** — जब प्रासंगिक
हो, और प्रति session अधिकतम एक बार, यह अपनी revision की तुलना published copy से और
आपके installed theme version की तुलना npm के latest से करती है, और यदि कोई भी पीछे
हो तो update करने की पेशकश करती है। theme upgrade करने के बाद नए options और features
पाने के लिए इसे फिर से download करें।

## अपनी docs के लिए `llms.txt` ship करें

ऊपर की skill *इस theme* के बारे में है। दूसरा पहलू है **आपकी** generated site को
किसी LLM के लिए पठनीय बनाना — और theme यह आपके लिए कर देता है।

हर content page पहले से एक companion `<page>/index.md` ship करता है (वही जो
copy-page button Claude / ChatGPT / Perplexity को देता है)।
[`llmsTxt`](/theme/configuration#llmstxt) सेट करें और build वह index जोड़ देता है
जो इन सबको बाँधता है:

```json5
// jsdoc.json
opts: { siteUrl: "https://example.com", llmsTxt: true }
```

- **`/llms.txt`** — एक [llmstxt.org](https://llmstxt.org) index: आपके project का
  नाम, एक-पंक्ति summary, फिर हर sidebar group के लिए एक section, जिसकी हर entry
  page की Markdown से link करती है, HTML से नहीं।
- **`/llms-full.txt`** — सारे pages जुड़े हुए, ताकि पूरी docs site एक ही context
  window में paste हो सके।

`siteUrl` आवश्यक है (file अपने आप fetch होती है, इसलिए उसके links absolute होने
चाहिए)। बड़े API reference पर `llmsTxt: { api: "index" }` index को पूरा रखता है
और generated symbol bodies को full file से बाहर रखता है।

## यह भी देखें

- [Configuration](/theme/configuration) — वही options जिन्हें skill document करती
  है, एक browsable reference के रूप में rendered।
- [JSDoc Getting Started](/theme/jsdoc-getting-started) ·
  [TypeDoc Getting Started](/theme/typedoc-getting-started) — build सेट करें।
- [Structure your sidebar](/guides/structure-your-sidebar) और
  [Authoring](/components/callouts) — वे गहरे विवरण जिन्हें skill संक्षिप्त करती है।
