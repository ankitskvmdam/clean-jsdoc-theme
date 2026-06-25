---
title: 配置
group: Using the Theme
order: 4
---

# 配置

每个主题选项都位于 `jsdoc.json` 中的 `opts` 之下（对于 TypeDoc，则位于
`typedoc.json` 中的 `cleanJsdocTheme` 块之下——参见下方的 JSDoc vs
TypeDoc）。构建的其余部分如何设置，请参阅
[JSDoc Getting Started](/theme/jsdoc-getting-started) 和 [TypeDoc Getting
Started](/theme/typedoc-getting-started)；本页记录的是主题自身的选项。

下方每个选项都以选项卡形式展示了两种工具的代码片段——选择与你的设置相匹配的那一个即可。

> [!WARNING]
> 未知或拼写错误的选项默认只会**警告**（并附带“did you mean?”
> 提示）——构建会继续进行。将 [`strict`](#strict) 设为启用，可把这些警告
> 变为错误。

## JSDoc vs TypeDoc

本页的每个选项对于两种工具都是相同的——只是**放置位置**
不同。在 JSDoc 中，主题选项位于 `opts` 之下；在 TypeDoc 中，则位于
`cleanJsdocTheme` 之下。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

主题选项位于 **`opts`** 之下，与 JSDoc 自身的选项并列：

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

主题作为插件加载，并被选作一种输出；它的选项位于
**`cleanJsdocTheme`** 之下：

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

选项名称和取值是完全相同的——只是命名空间不同：
**`opts`**（JSDoc）与 **`cleanJsdocTheme`**（TypeDoc）。有一个例外：
[`outputSourceFiles`](#outputsourcefiles) 和
[`sourceLinkToComment`](#sourcelinktocomment) 这两个选项位于 JSDoc 的
`templates.default` 之下，且仅 JSDoc 可用。

## 站点与标识

### `siteName`

页眉中显示的标题——可以是纯文本，也可以是一张 logo 图片。

**预期值：** 一个字符串，或一个 logo 集合对象。logo 集合的键都是
字符串：`light` 和 `dark` 是各主题下使用的 logo URL（或本地路径），`default`
是未提供主题专属 logo 时的回退值，而 `alt` 是图片加载失败时显示的文本（也会被屏幕阅读器读取）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteName: "My Library" }
// or a logo that swaps with the theme:
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
// or a logo that swaps with the theme:
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

默认值为你的包的 `name`。

### `basePath`

渲染器为每个内部链接和资源添加前缀的站点根路径——当站点托管在
某个子路径而非域名根目录下时，请设置它。

**预期值：** 一个字符串路径。默认值为 `""`（在根目录提供服务）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { basePath: "/my-library" } // served at example.com/my-library/
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { basePath: "/my-library" } // served at example.com/my-library/
```

</tab>

</tabs>

### `siteUrl`

你站点的公开 base URL。设置后，构建会在 output root 生成一个
**`sitemap.xml`**——每个页面一条记录（不含隐藏的 source-viewer 页面）——你可以
将它提交给搜索引擎，或在 `robots.txt` 中引用。不设置则不生成 sitemap。

**预期值：** 一个绝对的 `http(s)` URL。每个页面的 URL 只使用它的 **origin**；
部署子路径来自 [`basePath`](#basepath)，因此两者绝不会重复计入——无论是裸 origin
(`https://example.com`)，还是 path 恰好等于你 `basePath` 的完整 URL
(`https://example.com/my-library`)，都会生成相同且正确的 `<loc>` 条目。不需要
sitemap 时省略它（默认）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteUrl: "https://example.com", basePath: "/my-library" }
// → 生成包含 https://example.com/my-library/… URL 的 sitemap.xml
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteUrl: "https://example.com", basePath: "/my-library" }
```

</tab>

</tabs>

### `favicon`

一个指向 favicon 图片的路径。桥接器会把它复制为一个带内容哈希的
`_assets/` 资源，并向每个页面的 `<head>` 中输出一个 `<link rel="icon">`（其
`type` 由扩展名派生 —— `.svg` → `image/svg+xml`）。

**预期值：** 一个文件路径字符串（`.svg`、`.png`、`.ico`……），相对于工作
目录。省略 → 不输出 favicon 链接。

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
> **SVG** favicon 需要这个选项 —— 浏览器只会自动发现根目录下的
> `favicon.ico`，绝不会自动发现 SVG。一个 SVG 图标还可以通过其内部的
> `@media (prefers-color-scheme: dark)` block 来适配浅色/深色。

## 内容来源

### `readme`

一个被渲染为站点**主页**的 Markdown 文件。

**预期值：** 一个路径字符串。（根目录下的 `docs/index.md` 会覆盖它——参见
[`docs`](#docs)。）

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

一个存放手写 Markdown/HTML 指南的目录，会被渲染为正文页面。
文件夹布局决定了每个页面的 URL 和侧边栏分组；每个文件的 YAML
frontmatter（`title`、`group`、`order`、`slug`、`hidden`）会覆盖
默认值，而根目录下的 `index.md` 会成为主页。

**预期值：** 一个路径字符串（一个目录）。

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

侧边栏中顶层**文档**分组的显示顺序。

**预期值：** 一个由分组标签字符串组成的数组。

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
> 你正在浏览的这个站点本身就是用 `docs` 和 `docGroups` 选项构建的——它的指南
> 都是普通的 Markdown 文件，被分组到你此刻浏览的侧边栏各节中。
> 想构建类似的东西？浏览源代码：
> [docs-site on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site)。

### `defaultDocGroup`

当一个文档未声明任何分组（既没有 frontmatter `group`，
也没有可读取为人类可读形式的文件夹）时所归入的分组标签。

**预期值：** 一个单独的字符串。

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

JSDoc 的 `--tutorials` 目录。每个教程都会成为一个指南页面，在侧边栏中
归入“Tutorials”分组。

**预期值：** 一个路径字符串（一个目录）。等同于 JSDoc 的 `-u` 标志。

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

## 侧边栏与导航

### `sectionOrder`

**所有**顶层侧边栏分节的顺序——既包括你的文档/类别分组，
也包括 API 类型标签（Classes、Modules……）。列出的标签按给定
顺序排在最前；任何被你省略的内容都会追加在其后。

**预期值：** 一个由分节标签字符串组成的数组。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

</tabs>

### `clubSidebarItems`

将相关条目（例如一个模块及其成员）归并到一个共享、
可折叠的父项之下，按第一个 `/` 之前的路径段进行分组。

**预期值：** 一个布尔值。默认值为 `false`。

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

### `menu`

固定在侧边栏导航上方的自定义链接。

**预期值：** 一个由条目组成的数组。每个条目都是一个对象，包含 `title`、
一个 `link`（或 `href`）、一个可选的 `id`，以及一个可选的 `icon`——`lucide:<name>`
或 `simpleicons:<name>`，从 CDN 加载。还有两个可选字段用于控制链接呈现：`target`
（链接 target——外部链接默认为 `_blank`）和 `class`（合并到所渲染链接上的额外 CSS 类）。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    // 在同一标签页打开 + 加上自定义类以便通过 customCss 设置样式：
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

每个内容页面底部的“上一页/下一页”翻页器——两张卡片，按侧边栏阅读顺序
链接到相邻的页面。默认开启；源码查看器页面从不显示它。

**预期值：** 一个布尔值简写，或一个对象 `{ enabled }`。默认值为 `true`。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { pageNav: false }
// or the object form: opts: { pageNav: { enabled: false } }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { pageNav: false }
// or the object form: cleanJsdocTheme: { pageNav: { enabled: false } }
```

</tab>

</tabs>

## 外观与资源

### `fonts`

覆盖字体族。

**预期值：** 一个包含 `heading`、`body` 和/或 `mono` 的对象。`heading` 和
`body` 是 Google Fonts 字体族名称（会为你自动加载，并在构建时检查其是否存在）；
`mono` 是一个 CSS 字体栈。

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

### `colors` 和 `darkColors`

为主题重新配色。`colors` 是浅色模式调色板（同时也是 `:root`
默认值）；`darkColors` 是深色模式调色板，会在
`[data-theme="dark"]` 下输出。两者都会**按键**合并到内置调色板之上，因此你
可以只覆盖 `bg` 而保留其他所有默认值。

**预期值：** 一个包含以下任意键子集的对象，每个键的值都是一个 CSS 颜色字符串
（主题默认使用 [oklch](https://oklch.com)，但任何有效的 CSS 颜色都可以）：

| Key         | Role                                            |
| ----------- | ----------------------------------------------- |
| `bg`        | 页面背景                                        |
| `bgMuted`   | 弱化的表面（代码块、卡片、侧边栏）              |
| `fg`        | 正文文本                                        |
| `fgMuted`   | 次要 / 弱化文本                                 |
| `accent`    | 链接、聚焦环、主按钮                            |
| `accentFg`  | `accent` 背景上的文本/图标                      |
| `border`    | 细线和分隔线                                    |
| `codeHeaderBg`    | 代码块 header 条的背景                    |
| `codeHeaderFg`    | 代码块 header 标签文本                    |
| `codeHighlightBg` | 高亮代码行的背景（`@playground` / `highlight=`） |

这三个 `code*` 键为代码块的外壳配色 —— header 条（其背景 + `CODE`/文件名标签）
以及高亮行上的着色。它们在浅色下默认为一种中性的 `#f7f7f7` 等效色，在深色下
默认为提亮的灰色，因此你只需在匹配自定义调色板时才设置它们。

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

未知的键和非字符串值会被忽略。如果你完全省略 `darkColors`，
深色模式会回退到对 `colors` 进行合理的 bg/fg 互换。

### `customCss` 和 `customJs`

注入到每个页面的内联 CSS/JS。自定义 CSS 在主题样式表**之后**加载
（因此会覆盖它）；自定义 JS **最后**运行。

**预期值：** 一个字符串。

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

### `customCssFile` 和 `customJsFile`

与上面相同，但从磁盘上的文件读取。桥接器会将每个文件复制为一个
带内容哈希的资源并链接它。

**预期值：** 一个路径字符串。

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

自定义资源的文件名是否进行内容哈希（用于缓存失效）。设为
`false` 可保留稳定、未哈希的名称。

**预期值：** 一个布尔值。默认值为 `true`。

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

## LLM 与页面复制

### `copyPage`

每个页面的“复制页面”/“在 LLM 中打开”按钮（仅限内容页面）。

**预期值：** 一个布尔值简写，或一个对象 `{ enabled, actions }`，其中
`actions` 是 `copy`、`view`、`claude`、`chatgpt`、`perplexity` 中的任意若干项。默认
开启并包含所有 action。

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// or simply: opts: { copyPage: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// or simply: cleanJsdocTheme: { copyPage: false }
```

</tab>

</tabs>

### `aiPrompt`

当一个页面通过“在……中打开”action 交给 LLM 时，在其前面附加的
自定义指令。

**预期值：** 一个字符串。

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

## 源文件

> [!INFO]
> 这两个选项**仅 JSDoc 可用**。它们位于 `templates.default`（JSDoc 的
> 默认模板命名空间）之下，而不是 `opts` 或 `cleanJsdocTheme` 之下。

### `outputSourceFiles`

是否生成带语法高亮的源文件查看器页面，以及成员上的
`Source: file:line` 链接。

**预期值：** 一个布尔值。默认值为 `true`；设为 `false` 可同时禁用两者。

```json5
templates: { default: { outputSourceFiles: false } }
```

### `sourceLinkToComment`

`Source:` 链接的落点：符号的**声明**（默认）或其
文档**注释**。

**预期值：** 一个布尔值。默认值为 `false`（落在声明上）。

```json5
templates: { default: { sourceLinkToComment: true } }
```

### 资源是如何处理的

这一项你无需配置，但了解从你的文档和 README 中引用的本地文件是如何被
处理的很有帮助。任何你用相对路径或根相对路径链接的图片——
`![diagram](./assets/flow.svg)`——都会被复制到站点的
`_assets/` 目录下，并使用一个**内容哈希**名称（例如
`_assets/flow.3de65053.svg`），引用也会被重写以指向它。该
哈希派生自文件的字节内容，因此未改变的文件在多次构建间会保持稳定、
可缓存的 URL，而改变了的文件会自动使缓存失效。外部
（`https://…`）和 `data:` URL 则保持原样不变。

`.svg` 文件会多一个步骤：它们的标记会被直接**内联**到
页面中，而不是通过 `<img>` 加载。这使得 SVG 自身的
`[data-theme="dark"]` 样式能够跟随页面内的主题切换——而通过 `<img>` 加载的
SVG 只能感知操作系统的配色方案，永远无法感知你站点的切换状态。

logo（[`siteName`](#sitename)）以及
[`customCssFile` / `customJsFile`](#customcssfile-and-customjsfile) 都走相同的
带内容哈希的 `_assets/` 流水线。

## 本地化

这两个选项让你的站点启用**多语言**构建——每个 locale 一个静态站点，
并接入了页眉语言切换器和 `hreflang` 备用链接。它们
声明 locale；而实际的翻译工作流（提取目录、
翻译以及构建每个 locale）则通过
[`clean-jsdoc`](/packages/aadesh-overview) CLI 运行。完整的操作流程见
[Localize your docs](/guides/localize-your-docs)。没有 `locales` 的构建不会
受到影响——它的渲染结果和以前完全一样。

> [!INFO]
> 本地化**构建**目前仅 JSDoc 可用。TypeDoc 桥接器可以*提取*
> 目录，但尚不能渲染各 locale 的站点。

### `locales`

要构建的语言。

**预期值：** 一个由 `{ code, name }` 对象组成的数组（`name` 是切换器
标签），或纯 locale 代码字符串。代码大致遵循 BCP-47（`en`、`pt-BR`）。

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

在站点根目录渲染的语言（其他每个 locale 都落在
`/<code>` 之下）。

**预期值：** 一个出现在 [`locales`](#locales) 中的 locale 代码。可选——
默认为第一个条目。

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

## 构建

### `strict`

将选项诊断（错误的字体名称、未知的键）从警告升级为
硬性构建错误。

**预期值：** 一个布尔值。默认值为 `false`。

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

切换构建的进度输出（各阶段的旋转指示器）。

**预期值：** 一个布尔值。默认值为 `true`。

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
