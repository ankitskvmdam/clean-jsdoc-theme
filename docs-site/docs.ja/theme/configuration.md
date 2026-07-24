---
title: 設定
group: Using the Theme
order: 4
---

# Configuration

すべての theme option は、`jsdoc.json` の `opts` の下に置かれます（TypeDoc の場合
は、`typedoc.json` の `cleanJsdocTheme` block の下 — すぐ下の [JSDoc vs
TypeDoc](#jsdoc-vs-typedoc) を参照）。残りの build のセットアップは
[JSDoc Getting Started](/theme/jsdoc-getting-started) と
[TypeDoc Getting Started](/theme/typedoc-getting-started) で説明しています。この
ページでは theme 自身の options を解説します。

以下の各 option は、両方の tool 向けの snippet を tabs で示します — お使いの setup
に合うものを選んでください。

> [!WARNING]
> 不明な、あるいは綴り間違いの options は、default では **警告** を出すだけです
> （「もしかして?」のヒント付き） — build は続行します。それらの警告を errors に
> 変えるには [`strict`](#strict) を設定してください。

## JSDoc vs TypeDoc

このページのすべての option は両方の tool で同じです — 異なるのは **どこに置くか**
だけです。JSDoc では theme options は `opts` の下に入り、TypeDoc では
`cleanJsdocTheme` の下に入ります。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

theme options は **`opts`** の下に、JSDoc 自身の options と並んで置かれます:

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    // ↓ theme options
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

theme は plugin として load され、output として選択されます。その options は
**`cleanJsdocTheme`** の下に置かれます:

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  // ↓ theme options
  cleanJsdocTheme: {
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

</tabs>

option の名前と値は同じです — 変わるのは namespace だけです: **`opts`**
（JSDoc）と **`cleanJsdocTheme`**（TypeDoc）。一つだけ例外があります:
[`outputSourceFiles`](#outputsourcefiles) と
[`sourceLinkToComment`](#sourcelinktocomment) の options は JSDoc の
`templates.default` の下に置かれ、JSDoc 専用です。

## Site & identity

### `siteName`

header に表示される title — プレーンな text、または logo image です。

**期待される値:** string、または logo set の object。logo set の keys はすべて
string です: `light` と `dark` は各 theme で使われる logo の URL（または local
path）、`default` は theme 固有のものが与えられていないときの fallback、`alt` は
image の load に失敗したときに表示される text（そして screen readers が読み上げる
もの）です。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteName: "My Library" }
// または theme と一緒に切り替わる logo:
opts: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteName: "My Library" }
// または theme と一緒に切り替わる logo:
cleanJsdocTheme: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

</tabs>

default ではお使いの package の `name` になります。

### `basePath`

renderer がすべての internal link と asset の前に付加する site root path です —
site が domain root ではなく sub-path の下で serve される場合に設定してください。

**期待される値:** string の path。default は `""`（root で serve）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { basePath: "/my-library" } // example.com/my-library/ で serve
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { basePath: "/my-library" } // example.com/my-library/ で serve
```

</tab>

</tabs>

### `siteUrl`

サイトの公開 base URL です。設定すると、build は output root に
**`sitemap.xml`** を emit します — page ごとに 1 エントリ（hidden な
source-viewer pages は除外）— で、search engine に submit したり `robots.txt`
から参照したりできます。未設定なら sitemap は生成されません。

**期待される値:** 絶対 `http(s)` URL。各 page の URL にはその **origin** のみが
使われ、deploy の sub-path は [`basePath`](#basepath) から来ます。そのため両者が
二重に数えられることはありません — 素の origin (`https://example.com`) でも、
path が `basePath` と一致する完全な URL (`https://example.com/my-library`) でも、
同じ正しい `<loc>` エントリになります。sitemap が不要なら省略してください
（default）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteUrl: "https://example.com", basePath: "/my-library" }
// → https://example.com/my-library/… の URL を持つ sitemap.xml
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteUrl: "https://example.com", basePath: "/my-library" }
```

</tab>

</tabs>

### `favicon`

favicon image への path です。bridge はそれを content-hashed な `_assets/` asset に
copy し、すべての page の `<head>` に `<link rel="icon">`（extension から導出された
`type` 付き — `.svg` → `image/svg+xml`）を emit します。

**期待される値:** working dir からの相対の、string の file path（`.svg`、`.png`、
`.ico`、…）。省略 → favicon link なし。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { favicon: "./assets/logo-small.svg" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { favicon: "./assets/logo-small.svg" }
```

</tab>

</tabs>

> [!TIP]
> **SVG** favicon にはこの option が必要です — browsers は root の `favicon.ico` し
> か自動発見せず、SVG は決して発見しません。SVG icon は、その中の
> `@media (prefers-color-scheme: dark)` block によって light/dark に適応させること
> もできます。

## Content sources

### `readme`

site の **home page** として render される Markdown file です。

**期待される値:** path の string。（root の `docs/index.md` がこれを override しま
す — [`docs`](#docs) を参照。）

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { readme: "./README.md" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { readme: "./README.md" }
```

</tab>

</tabs>

### `docs`

prose pages として render される、手書きの Markdown/HTML guides の directory です。
folder の layout が各 page の URL と sidebar group を決め、file ごとの YAML
frontmatter（`title`、`group`、`order`、`slug`、`hidden`）が defaults を override
し、root の `index.md` が home page になります。

**期待される値:** path の string（directory）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docs: "./docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docs: "./docs" }
```

</tab>

</tabs>

### `docGroups`

sidebar における top-level **doc** groups の表示順です。

**期待される値:** group-label の string の array。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

</tabs>

> [!TIP]
> このサイトそのものが `docs` と `docGroups` の options で作られています — その
> guides は、いままさにご覧になっている sidebar sections にまとめられたプレーンな
> Markdown files です。同じようなものを作りたいですか? source をご覧ください:
> [docs-site on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site)。

### `defaultDocGroup`

doc が group を宣言しないとき（frontmatter の `group` もなく、humanize できる
folder もないとき）に入る group label です。

**期待される値:** 単一の string。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultDocGroup: "Docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultDocGroup: "Docs" }
```

</tab>

</tabs>

### `tutorials`

JSDoc の `--tutorials` directory です。各 tutorial は guide page になり、sidebar の
「Tutorials」の下にまとめられます。

**期待される値:** path の string（directory）。JSDoc の `-u` flag に相当します。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { tutorials: "./tutorials" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { tutorials: "./tutorials" }
```

</tab>

</tabs>

## Sidebar & navigation

### `sectionOrder`

**すべての** top-level sidebar sections の順序です — あなたの doc/category groups
と API kind labels（Classes、Modules、…）の両方。列挙した labels が与えた順序で
先に来て、省略したものはその後ろに追加されます。

**期待される値:** section-label の string の array。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
// 受け付けられますが TypeDoc では効果がありません — 下記の note を参照。
cleanJsdocTheme: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

</tabs>

> [!NOTE]
> **JSDoc** では `sectionOrder` は doc/tutorial groups と API kind sections を
> 順序付けます。**TypeDoc** では**まったく効果がありません** — その sidebar は
> 独自の固定された順序を持つ module/folder hierarchy であり、そこでの doc groups
> は `sectionOrder` ではなく [`docGroups`](#docgroups) で順序付けられます。
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor) を参照してください。

### `clubSidebarItems`

関連する entries（たとえば module とその members）を、共有の collapsible parent の
下にまとめます。最初の `/` より前の path segment ごとにグループ化されます。

**期待される値:** boolean。default は `false`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { clubSidebarItems: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { clubSidebarItems: true }
```

</tab>

</tabs>

> [!NOTE]
> `clubSidebarItems` は TypeDoc API tree には効果がありません。
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor) を参照してください。

### `collapsibleSidebarSections`

top-level の sidebar sections を折りたたみ可能にします — 各 section header が、
その entries を展開/折りたたみする toggle になります。sections は default で
**開いた**状態です; visitor の折りたたみ/展開状態は、visitor ごとに
`localStorage` に永続化されます。

**期待される値:** `true`（または省略）→ すべての top-level section が
折りたたみ可能（**default**）; `false` → どれも折りたたみ可能にしない; `string[]`
→ 列挙した section labels のみ、**完全一致かつ大文字小文字を区別**して照合
（`'Class'` は `'Classes'` に一致**しません**）。labels は render される section
headers です: 複数形の kind labels（`Classes`、`Namespaces`、`Interfaces`、
`Modules`、`Typedefs`/`Type Aliases`、`Enumerations`、`Functions`、
`Variables`、`Globals`）、`@category` の top-level segments、doc-group labels、
`Tutorials`、`Source Files`。array 内のどの entry も render された section に
一致しない場合、利用可能な sections を列挙した build warning が出力されます。

> [!NOTE]
> **function form はありません** — value は build time に一度だけ解決されます。
> `sectionOrder` / `clubSidebarItems` とは異なり、`collapsibleSidebarSections`
> は **JSDoc と TypeDoc の両方**で同じように動作します。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  // all top-level sections collapsible (default if omitted)
  collapsibleSidebarSections: true,

  // …or only these (exact, case-sensitive labels):
  collapsibleSidebarSections: ["Namespaces", "Classes"],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  collapsibleSidebarSections: true,
  // …or only these (exact, case-sensitive labels):
  collapsibleSidebarSections: ["Namespaces", "Classes"],
}
```

</tab>

</tabs>

### `menu`

sidebar navigation の上にピン留めされる custom links です。

**期待される値:** entries の array。各 entry は object で、`title`、`link`（または
`href`）、省略可能な `id`、省略可能な `icon` を持ちます — `icon` は
`lucide:<name>` または `simpleicons:<name>` で、CDN から load されます。link の
表示を制御する省略可能な 2 つの field: `target`（link の target — external link は
既定で `_blank`）と `class`（render される link に merge される追加の CSS class）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    // 同じ tab で開く + customCss で style するための custom class を付与:
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

</tabs>

### `pageNav`

各 content page の下にある prev/next pager です — sidebar の読み順で前後の pages
を link する 2 枚の cards。default で on。source-viewer pages では決して表示され
ません。

**期待される値:** boolean の shorthand、または object `{ enabled }`。default は
`true`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { pageNav: false }
// または object 形式: opts: { pageNav: { enabled: false } }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { pageNav: false }
// または object 形式: cleanJsdocTheme: { pageNav: { enabled: false } }
```

</tab>

</tabs>

## Appearance & assets

### `fonts`

type families を override します。

**期待される値:** `heading`、`body`、`mono` のいずれか（または複数）を持つ object。
`heading` と `body` は Google Font family の名前（あなたのために load され、build
時に存在チェックされます）。`mono` は CSS font stack です。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

</tabs>

### `colors` and `darkColors`

theme を再配色します。`colors` は light-mode の palette（`:root` の default でもあ
ります）。`darkColors` は dark-mode の palette で、`[data-theme="dark"]` の下に
emit されます。それぞれ built-in palette に対して **key ごとに** merge されるので、
`bg` だけを override して他のすべての default を保つことができます。

**期待される値:** 以下の keys の任意の subset を持つ object。各値は CSS color の
string です（theme は [oklch](https://oklch.com) を採用していますが、有効な CSS
color なら何でも動きます）:

| Key         | 役割                                            |
| ----------- | ----------------------------------------------- |
| `bg`        | Page background                                 |
| `bgMuted`   | 控えめな面（code blocks、cards、sidebar）        |
| `fg`        | Body text                                       |
| `fgMuted`   | 二次的 / muted な text                           |
| `accent`    | Links, focus rings, primary buttons             |
| `accentFg`  | `accent` background 上の text/icon              |
| `border`    | 細い線と dividers                                |
| `codeHeaderBg`    | Code-block header strip の background     |
| `codeHeaderFg`    | Code-block header label の text           |
| `codeHighlightBg` | Highlight された code 行の background（`@playground` / `highlight=`） |

3 つの `code*` keys は code-block の chrome を style します — header strip（その
background と `CODE`/filename label）と、highlight された行の tint です。default では
light で中立的な `#f7f7f7` 相当、dark で持ち上げた greys になるので、custom palette に
合わせたいときだけ設定すれば足ります。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

</tabs>

不明な keys と非 string の値は無視されます。`darkColors` を完全に省略すると、dark
mode は `colors` の妥当な bg/fg 入れ替えに fallback します。

### `customCss` and `customJs`

すべての page に inject される inline の CSS/JS です。custom CSS は theme の
stylesheet の **後** に load されます（そのため override できます）。custom JS は
**最後** に実行されます。

**期待される値:** string。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

</tabs>

### `customCssFile` and `customJsFile`

上と同じですが、disk 上の file から読み込みます。bridge は各 file を
content-hashed な asset に copy して link します。

**期待される値:** path の string。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

</tabs>

### `hashCustomAssets`

custom-asset の filenames を content-hashed にするかどうかです（cache-busting の
ため）。安定した、hash なしの名前を保つには `false` を設定してください。

**期待される値:** boolean。default は `true`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { hashCustomAssets: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { hashCustomAssets: false }
```

</tab>

</tabs>

## LLM & copy page

### `copyPage`

page ごとの「copy page」/「open in LLM」ボタンです（content pages のみ）。

**期待される値:** boolean の shorthand、または object `{ enabled, actions }`。
`actions` は次のいずれか: `copy`、`view`、`claude`、`chatgpt`、`perplexity`。
default で on、すべての actions 付き。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// または単に: opts: { copyPage: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// または単に: cleanJsdocTheme: { copyPage: false }
```

</tab>

</tabs>

### `aiPrompt`

page が open-in actions を通じて LLM に渡されるときに前に付加される、custom な
指示です。

**期待される値:** string。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

</tabs>

## Source files

> [!INFO]
> この 2 つは **JSDoc 専用** です。これらは `opts` や `cleanJsdocTheme` ではなく、
> `templates.default`（JSDoc の default-template namespace）の下に置かれます。

### `outputSourceFiles`

syntax-highlighted な source-file viewer pages と、members 上の `Source:
file:line` links を生成するかどうかです。

**期待される値:** boolean。default は `true`。両方を抑制するには `false` を設定し
てください。

```json5
templates: { default: { outputSourceFiles: false } }
```

### `sourceLinkToComment`

`Source:` link がどこに着地するか: symbol の **declaration**（default）か、その
documentation **comment** か。

**期待される値:** boolean。default は `false`（declaration に着地）。

```json5
templates: { default: { sourceLinkToComment: true } }
```

### How assets are handled

これは設定するものではありませんが、docs や README から参照される local files が
どう処理されるかを知っておくと役立ちます。relative または root-relative な path で
link した image — `![diagram](./assets/flow.svg)` — はすべて、site の `_assets/`
directory に **content-hashed** な名前（たとえば `_assets/flow.3de65053.svg`）で
copy され、参照はそれを指すように書き換えられます。hash は file の bytes から
導出されるので、変更されていない file は builds をまたいで安定した cacheable な
URL を保ち、変更された file は自動的に cache-bust されます。外部（`https://…`）と
`data:` の URLs はそのまま残ります。

`.svg` files にはもう 1 ステップあります: その markup は `<img>` を介して load する
のではなく、page に直接 **inline** されます。これにより、SVG 自身の
`[data-theme="dark"]` styles が in-page の theme toggle に追従できます — `<img>`
から load された SVG は operating system の color scheme しか見えず、あなたの site
の toggle は決して見えません。

Logos（[`siteName`](#sitename)）と
[`customCssFile` / `customJsFile`](#customcssfile-and-customjsfile) も、同じ
content-hashed な `_assets/` pipeline に乗ります。

## Localization

この 2 つは、あなたの site を **多言語** build に切り替えます — locale ごとに 1 つ
の static site が作られ、header の language switcher と `hreflang` alternates が
組み込まれます。これらは locales を宣言するもので、実際の translation workflow
（catalogs の抽出、翻訳、そして各 locale の build）は
[`clean-jsdoc`](/packages/aadesh-overview) CLI から実行します。完全な walkthrough
は [Localize your docs](/guides/localize-your-docs) にあります。`locales` のない
build には影響がありません — まったく以前どおりに render されます。

> [!INFO]
> localized **builds** は今のところ JSDoc 専用です。TypeDoc bridge は catalogs を
> *抽出* できますが、まだ per-locale sites の render はしません。

### `locales`

build する言語です。

**期待される値:** `{ code, name }` objects の array（`name` は switcher の label）、
またはプレーンな locale-code の string。Codes は BCP-47 風です（`en`、`pt-BR`）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

</tabs>

### `defaultLocale`

site root に render される言語です（他のすべての locale は `/<code>` の下に着地し
ます）。

**期待される値:** [`locales`](#locales) に存在する locale code。省略可能 —
default では最初の entry。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultLocale: "en" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultLocale: "en" }
```

</tab>

</tabs>

## Build

### `strict`

option の diagnostics（不正な font 名、不明な key）を、警告から厳格な build errors
に格上げします。

**期待される値:** boolean。default は `false`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { strict: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { strict: true }
```

</tab>

</tabs>

### `progress`

build の progress 出力（stage ごとの spinners）を切り替えます。

**期待される値:** boolean。default は `true`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { progress: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { progress: false }
```

</tab>

</tabs>
