---
title: v4 → v5 माइग्रेशन
group: Using the Theme
order: 6
---

# v4 → v5 माइग्रेशन

v5 ज़मीन से नया लिखा गया है: यह हर page को server-render करता है, हर एक के लिए एक
साथी `.md` emit करता है, built-in search और एक source viewer ship करता है, और एक
`opts.docs` prose pipeline जोड़ता है। configuration की सतह काफ़ी बदली — पर यह कदम
यांत्रिक है, और यह page (और नीचे दी गई migration skill) आपको इससे गुज़ार देगी।

> [!TIP]
> **आप यह पूरा काम अपने AI assistant को सौंप सकते हैं।** इसके लिए एक समर्पित
> [**migration skill**](#किसी-agent-से-करवाएँ) है — अपने agent को इस पर इंगित करें
> और यह आपके options उठाएगा, जो आगे जाते हैं उन्हें rename करेगा, जो ख़त्म हो गए
> उन्हें हटाएगा, और build verify करेगा। नीचे [किसी agent से करवाएँ](#किसी-agent-से-करवाएँ)
> देखें।

## जानने लायक एक बात

v4 theme options को **`opts.theme_opts.*`** के नीचे nest करता था। v5 उन्हें
**सीधे `opts.*` से** पढ़ता है — v5 में कोई `theme_opts` block नहीं है। तो migration
मूलतः यह है: अपने options को `theme_opts` से बाहर ऊपर उठाएँ, जो थोड़े-से आगे जाते
हैं उन्हें rename करें, बाक़ी हटाएँ, फिर वैकल्पिक रूप से v5 के नए features अपनाएँ।

```json5
// v4 — opts.theme_opts के नीचे nested
{ opts: { template: "node_modules/clean-jsdoc-theme",
          theme_opts: { default_theme: "dark", title: "My Library" } } }

// v5 — सीधे opts के नीचे (कोई theme_opts नहीं)
{ opts: { template: "node_modules/clean-jsdoc-theme",
          siteName: "My Library" } }
```

## कदम

<steps>

<step label="Check compatibility">

v5 को **JSDoc ≥ 4** और **Node ≥ 20** चाहिए। `plugins/markdown` plugin अब theme के
लिए ज़रूरी नहीं है (v5 Markdown को ख़ुद render करता है), हालाँकि उसे रखना हानिरहित
है। फ़िलहाल v4 पर रहना पसंद करेंगे? `"clean-jsdoc-theme": "^4"` pin करें — v5
prereleases npm `next` tag के नीचे publish होते हैं, इसलिए `^4` उन्हें नहीं खींचेगा।

</step>

<step label="Upgrade the package">

```sh
npm i -D clean-jsdoc-theme@latest   # या v5 prerelease के दौरान @next
```

</step>

<step label="Lift and rename options">

हर key को `theme_opts` से बाहर निकालकर `opts` तक ऊपर ले जाएँ,
[mapping table](#option-mapping) लागू करते हुए, फिर ख़ाली `theme_opts` block हटा
दें। जो options आगे जाते हैं (बाक़ी सब हटा दिए जाते हैं):

- `base_url` → [`basePath`](/theme/configuration#basepath)
- `title` → [`siteName`](/theme/configuration#sitename)
- `sections` → [`sectionOrder`](/theme/configuration#sectionorder)
- `create_style` → `customCss`, `include_css` / `add_style_path` →
  [`customCssFile`](/theme/configuration#customcssfile-and-customjsfile)
- `add_scripts` → `customJs`, `include_js` / `add_script_path` → `customJsFile`
- `menu` → [`menu`](/theme/configuration#menu) (फिर से ढाला गया — नीचे देखें)

</step>

<step label="Build and verify">

```sh
npx jsdoc -c jsdoc.json
npx serve <destination>   # Pagefind full-text search को HTTP चाहिए
```

v5 किसी भी बचे-हुए `theme_opts` key या v4 option नाम पर **warn** करता है (एक "did
you mean?" संकेत के साथ) और build करता रहता है — output पढ़ें और जो यह चिह्नित करे
उसे ठीक करें। migrate करते समय उन warnings को कड़ी errors में बदलने के लिए
[`strict: true`](/theme/configuration#strict) सेट करें, फिर इसे ढीला कर दें।

</step>

</steps>

## Option mapping

`opts.theme_opts.<v4>` → `opts.<v5>`।

| v4 (`theme_opts.*`) | v5 (`opts.*`) | स्थिति | टिप्पणी |
| --- | --- | --- | --- |
| `default_theme` | — | हटाया गया | Light/dark token sets + runtime toggle; कोई picker नहीं। |
| `base_url` | `basePath` | renamed | links पर prefix किया जाने वाला site root। |
| `title` | `siteName` | बदला गया | String **या** एक logo set `{ default, dark, light, alt }`। |
| `menu` | `menu` | बदला गया | फिर से ढाला गया: `{ id?, title?, link/href?, icon?, target?, class? }` — `icon` + `id` built-ins जुड़े। |
| `sections` | `sectionOrder` | renamed | sidebar sections को filter + order करें। |
| `create_style` | `customCss` | renamed | Inline CSS (theme stylesheet के बाद load होता है)। |
| `include_css` / `add_style_path` | `customCssFile` | renamed/बदला गया | CSS file → content-hashed asset link। |
| `add_scripts` | `customJs` | renamed | Inline JS (अंत में चलता है)। |
| `include_js` / `add_script_path` | `customJsFile` | renamed/बदला गया | JS file → content-hashed asset। |
| `homepageTitle` | — | हटाया गया | Home `<title>` README / `docs/index.md` + `siteName` से derive होता है। |
| `includeFilesListInHomepage` | — | हटाया गया | Source Files section files सूचीबद्ध करता है। |
| `meta` | `meta` | बदला गया | फिर से समर्थित — attribute maps की एक array → `<head>` में `<meta>` tags। देखें [`meta`](/theme/configuration#meta)। |
| `search` | — | हटाया गया | हमेशा-on fuzzy search + वैकल्पिक Pagefind। |
| `codepen` | `playground` | बदला गया | v4 एक CodePen को `@example` से prefill करता था; v5 इसे [`playground`](/components/playground) में सामान्यीकृत करता है — किसी example को `opts.playground` + `@playground` tag के ज़रिये CodePen, JSFiddle, या CodeSandbox में खोलें। (किसी मौजूदा pen को URL से embed करने के लिए, [`@iframe`](/components/embeds) इस्तेमाल करें।) |
| `static_dir` | — | हटाया गया | JSDoc की अपनी static-file config इस्तेमाल करें। |
| `footer` | `footer` | बदला गया | फिर से समर्थित — एक inline HTML string या `{ file: "./footer.html" }`। इसे `customCss` / `customCssFile` से style करें। देखें [`footer`](/theme/configuration#footer)। |
| `exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle` | — | हटाया गया | कोई समतुल्य नहीं। |

> [!NOTE]
> **menu** फिर से ढाला गया: एक v4 entry `{ title, link, target, class, id }` एक
> v5 `{ id?, title?, link (or href)?, icon?, target?, class? }` बन जाती है — आप एक
> `icon` (`lucide:<name>` / `simpleicons:<name>`) जोड़ते हैं। v5 में, `id` built-ins
> भी चुनता है (`{ id: "home" }`, `{ id: "source" }`), और एक `menu`, `sectionOrder`
> पर वरीयता लेता है। देखें [`menu`](/theme/configuration#menu) और
> [Structure your sidebar](/guides/structure-your-sidebar)।

## पहले / बाद में

<tabs group="version">

<tab label="v4 (theme_opts)">

```json5
{
  plugins: ["plugins/markdown"],
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    theme_opts: {
      default_theme: "dark",
      base_url: "https://example.com/docs/",
      title: "My Library",
      menu: [{ title: "GitHub", link: "https://github.com/me/lib", target: "_blank" }],
      sections: ["Classes", "Modules", "Global"],
      search: true,
      footer: "© My Library",
      include_css: ["./static/custom.css"],
    },
  },
}
```

</tab>

<tab label="v5 (opts)">

```json5
{
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    basePath: "https://example.com/docs/",
    siteName: "My Library",
    menu: [
      { id: "home", title: "Home" },
      { title: "GitHub", link: "https://github.com/me/lib", icon: "simpleicons:github" },
    ],
    sectionOrder: ["Classes", "Modules", "Global"],
    customCssFile: "./static/custom.css",
    // हटाए गए: default_theme (auto), search (हमेशा on), footer (derived)
    docs: "./docs", // वैकल्पिक v5 फ़ायदा
  },
}
```

</tab>

</tabs>

## v5 में आप क्या अनलॉक करते हैं

Migration एक upgrade भी है। एक बार v5 पर आने के बाद, इनकी ओर बढ़ें:

- [**अपने API के साथ Prose guides**](/guides/combine-guides-and-api) — `docs` +
  `docGroups`, वही pipeline जो यह site इस्तेमाल करती है।
- [**Authoring primitives**](/components/callouts) — comments और prose में callouts,
  steps, tabs, और live embeds।
- [**Sidebar structure**](/guides/structure-your-sidebar) — `@category` / `@order`
  tags, `clubSidebarItems`, `menu`। (ये **JSDoc** sidebar लीवर हैं — TypeDoc का
  output इसके बजाय एक module/folder पदानुक्रम उपयोग करता है; देखें
  [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor)।)
- [**LLM features**](/theme/llm-skill) — प्रति page एक साथी `.md`, copy-page
  button, और `aiPrompt`।

## किसी agent से करवाएँ

इसे हाथ से नहीं करना चाहते? **अपने AI assistant को migration skill पर इंगित करें।**
यह एक केंद्रित, source-verified प्रक्रिया है जो आपका v4 config पहचानती है, ऊपर का
mapping लागू करती है, menu को फिर से ढालती है, जो ख़त्म हो गया उसे हटाती है, और
build verify करती है — फिर आपको umbrella skill सौंप देती है ताकि assistant नए v5
features अपनाने में आपकी मदद कर सके।

- **Migration skill:**
  [`SKILLS/migrate-v4-to-v5/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/migrate-v4-to-v5/SKILL.md)
  — इसे [umbrella skill](/theme/llm-skill) की तरह ही download करें:

  ```sh
  curl -O https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/migrate-v4-to-v5/SKILL.md
  ```

  फिर इसे अपने assistant से attach करें (या इसे `.claude/skills/` में डालें) और कहें
  *"migrate my project from clean-jsdoc-theme v4 to v5."*

- **Canonical reference:** विस्तृत
  [`MIGRATION.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/MIGRATION.md)
  और machine-readable
  [`migration-map.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/migration-map.json)
  skill का आधार हैं — codemods के लिए उपयोगी।

## यह भी देखें

- [Use with an LLM](/theme/llm-skill) — umbrella skill और इसे अपने assistant को
  कैसे खिलाएँ।
- [Configuration](/theme/configuration) — हर v5 option विस्तार से।
- [JSDoc Getting Started](/theme/jsdoc-getting-started) — शून्य से एक नया v5 setup।
