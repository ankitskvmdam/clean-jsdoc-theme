---
title: FAQ
group: Guides
order: 8
---

# FAQ

针对最常见问题的简短、实用解答 —— 嵌入实时内容、编写更丰富的 doc comments，
以及一些常见的配置调整。每条做法都会链接到包含完整细节的页面。

## 嵌入实时内容

主题可以在任何页面中插入一个沙箱化的 `<iframe>` —— 一个 CodePen、一个 YouTube
视频、一个 StackBlitz，或任意站点。有两种编写方式，它们
共享[同一套 config 语法](/components/embeds)：

- **在正文中**（README、guides、`docs` 文件夹）—— 一个 ` ```iframe ` 围栏代码块。
- **在 doc comment 中** —— `@iframe <url> key=value` block tag。

第一个 token 是 URL；其余的是 `key=value` 选项 —— `title`、`height`
（px）、`aspectRatio`（例如 `16/9`）、`width`、`allow`、`sandbox`、`clickToLoad`，
以及 `themed`。只接受 **`https://`**（或协议相对的 `//`）URL。

### 我该如何嵌入一个 CodePen？

使用该 pen 的 **embed** URL（`https://codepen.io/USER/embed/PEN_ID`）：

````md
```iframe
https://codepen.io/USER/embed/PEN_ID title="CodePen demo" height=400
```
````

> [!TIP]
> 在 CodePen 上，打开 **Embed** 并从 `<iframe src="…">`
> 代码片段中复制 URL。添加 `clickToLoad=true` 可在读者点击前显示一张轻量的海报图。

### 我该如何让读者在 CodePen / JSFiddle / CodeSandbox 中打开一个示例？

`@iframe` 通过 URL 嵌入一个**已存在**的 pen。要打开**来自一个 `@example` 的代码**
—— 预填好、无需现成的 pen —— 请改用 **playground** 功能：在 `opts.playground` 中
开启它，然后用 `@playground` 给该示例打 tag：

```js
/**
 * @example
 * const out = resize(img, 200);
 * @playground codepen jsfiddle filename=resize.js highlight=1
 */
export function resize(img, width) {}
```

代码块的 header 会多出一个 **"Open Code in"** 下拉菜单（CodePen / JSFiddle /
CodeSandbox），全部在客户端完成 —— 无需 API key。它在正文中也有效（一个
` ```js playground ` fence 或一个 `<playground>` block）。完整演练：
[Add a playground](/components/playground)。（`@playground` 需要
`tags.allowUnknownTags: true`，与 `@iframe` 相同。）

### 我该如何嵌入一个 YouTube 视频？

使用 **embed** URL（`https://www.youtube.com/embed/VIDEO_ID`），并为它设置
16/9 的宽高比，而不是固定 height：

````md
```iframe
https://www.youtube.com/embed/VIDEO_ID title="Intro video" aspectRatio=16/9
```
````

### 我该如何嵌入任何其他网站？

任何 `https://` URL 都可以 —— 以像素设置 `height`，或设置一个 `aspectRatio`：

````md
```iframe
https://example.com title="Live preview" height=480
```
````

### 我该如何从一条 JSDoc / TypeDoc comment 中嵌入？

使用 `@iframe` block tag —— 它会在符号的 `@example` 之后渲染：

```js
/**
 * Renders the chart.
 *
 * @iframe https://codepen.io/USER/embed/PEN_ID title="Demo" height=400
 */
export function render() {}
```

> [!IMPORTANT]
> 对原生 JSDoc 而言，`@iframe` 是一个 **unknown tag** —— 请在你的 `jsdoc.json` 中设置
> `tags.allowUnknownTags: true`，否则 JSDoc 会在主题运行之前
> 将其剥离。（TypeDoc 不需要这样的 flag。）

### 我的 embed 没有显示 —— 哪里出错了？

- URL 必须以 **`https://`**（或 `//`）开头。纯 `http://` 或相对
  path 会被拒绝，embed 会被静默丢弃。
- 未知的选项 key 会被忽略并产生一条构建警告 —— 请对照上面的
  列表检查拼写。

### 我能让它在点击时加载，而不是立即加载吗？

添加 `clickToLoad=true`：读者会看到一个海报按钮（带有 `<noscript>`
回退），iframe 在点击时加载。默认情况下它会立即加载，并且
完全无需 JavaScript 即可工作。

### embeds 会跟随浅色 / 深色主题吗？

默认会 —— 主题切换时会重新解析 embed URL（会替换一个
`{theme}` token，或追加 `?theme-id=<theme>`）。用
`themed=false` 退出此行为。完整参考：[Embeds & live demos](/components/embeds)。

## 更丰富的 doc comments

主题在正文中所做的一切，同样适用于**你的 JSDoc / TypeDoc
descriptions 内部** —— 它们经由同一个转换器流转。

### 我该如何在 comment 中添加一个 callout？

直接在 description 中写一个 GitHub 风格的 alert 引用块：

```js
/**
 * Connects to the database.
 *
 * > [!WARNING]
 * > Call `close()` when you're done — connections are not pooled.
 */
export function connect() {}
```

这些标记映射到四种样式：`[!NOTE]` / `[!INFO]` / `[!IMPORTANT]` → info，
`[!TIP]` / `[!SUCCESS]` → tip，`[!WARNING]` / `[!CAUTION]` → warning，以及
`[!ERROR]` / `[!DANGER]` → error。参见 [Callouts](/components/callouts)。

### 我能在 comment 中使用 steps 或 tabs 吗？

可以 —— 同样的 `<steps>`（以及 `<tabs>`）标记在 description 中也有效；没有
专用的 tag，你直接编写标记即可：

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

完整语法和空行规则参见 [Steps](/components/steps) 和
[Tabs](/components/tabs)，渲染效果可见实时的
[sample-api module page](/api-docs/module/sample-api)。

### 弃用通知怎么办？

直接使用 `@deprecated` —— 主题会自动将其渲染为一个 callout，无需任何
标记：

```js
/**
 * @deprecated Use {@link connect} instead.
 */
```

## 配置调整

### 我该如何使用一个 logo 来替代站点名称文本？

将 `siteName` 设置为一个带有 `light` / `dark` 图片 path 的 logo 对象（以及一个
`alt` 回退）—— 参见 [`siteName`](/theme/configuration#sitename)。

### 我该如何控制侧边栏的分组和顺序？

在符号上使用 `@category` / `@order`，在 guide 页面上使用 frontmatter 的 `group` / `order`，
以及 `sectionOrder` 选项。[Structure your
sidebar](/guides/structure-your-sidebar) 涵盖了每一个调节杆。

### 我的 `@category` / `@order` / `@playground` / `@iframe` tags 不起作用

最可能的原因：你的 `jsdoc.json` 中 **`tags.allowUnknownTags` 不是 `true`**。
这些全都是基础 JSDoc 不定义的 tags，所以它会在主题运行**之前就把它们剥离**——
你的 categories 会塌缩为默认的 kind sections，`@order` 不起任何作用，而
`@playground` / `@iframe` 永远不会渲染。请设置该 flag：

```json
{ "tags": { "allowUnknownTags": true } }
```

（TypeDoc 没有这样的限制 —— 它会原样传递这些 tag。）完整列表参见 [Custom
tags](/components/overview)。

### 我该如何在 API reference 旁边添加手写的 guides？

将 `opts.docs` 指向一个 Markdown 文件夹。参见 [Build a guides
site](/guides/build-a-guides-site) 和 [Combine guides +
API](/guides/combine-guides-and-api)。

### 我该如何设置 favicon？

将 [`favicon`](/theme/configuration#favicon) 指向一个图片文件。主题会把它复制为一个
带内容哈希的资源，并向每个页面的 `<head>` 添加一个 `<link rel="icon">`：

```json5
opts: { favicon: "./assets/logo.svg" }
```

这是使用 **SVG** favicon 的方式 —— 浏览器只会自动发现根目录下的
`favicon.ico`，绝不会自动发现 SVG，因此它需要主题输出的那个 `<link>`。（一个 SVG
甚至可以通过其内部的 `@media (prefers-color-scheme: dark)` block 来适配浅色/深色。）
v4 的 `favicon` 选项在 v5 早期一度被移除，现已回归。

### 我该如何关闭 “copy page” / “open in LLM” 按钮？

用 [`copyPage`](/theme/configuration#copypage) 对其进行配置或禁用。

### 为什么我的构建会就某个未知选项发出警告？

未知或拼写错误的选项默认会发出**警告**（带有一条 “did
you mean?” 提示），并且构建会继续。设置 [`strict`](/theme/configuration#strict) 可将
这些警告转为错误。

## Localization

### 我该如何构建一个本地化（多语言）站点？

在同一个 `opts` block 中声明你的语言，并用
`clean-jsdoc` CLI（即 `@clean-jsdoc-theme/aadesh` 包）来驱动构建：

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

你会得到每种语言一个站点（默认语言在根路径，其余在
`/<locale>` 之下）、一个 header language switcher，以及 `hreflang` tags。正文按
文件本地化 —— 一个 `README.<locale>.md` 主页和一个 `docs.<locale>/` 覆盖层 —— 而
每个 locale 的字体则通过 `"ja:heading"` 这类 key 设置。完整的操作演练见
[Localize your docs](/guides/localize-your-docs)。

## 与 LLM 协作

### 我在开发中使用 LLM —— 我该如何最大限度地发挥 clean-jsdoc-theme 的作用？

clean-jsdoc-theme 在两个方向上都被设计为 **LLM-friendly**：

- **你生成的站点可被 AI 读取。** 每个页面都会输出一个配套的
  Markdown 文件（`<page>/index.md`），并且每个页面都有一个 **copy / open-in-LLM**
  按钮，将干净的 `.md` 直接交给 Claude / ChatGPT / Perplexity —— 这样
  助手读到的正是你的用户所读的同一份参考内容。可用
  [`copyPage`](/theme/configuration#copypage) 和
  [`aiPrompt`](/theme/configuration#aiprompt) 来微调这次交接。
- **设置主题本身就是 AI 辅助的。** 有一个可下载的
  [**skill**](/theme/llm-skill)，能把任何 coding assistant 变成一位
  clean-jsdoc-theme 专家 —— 把你的 agent 指向它，它就能编写你的
  `jsdoc.json`/`typedoc.json`，编写带有 callouts/steps/tabs 的 guides，构建
  侧边栏，连接 cross-links，设置 localization，以及调试一次构建，全都
  基于经源代码验证的知识，而非凭空猜测。把 skill 文件夹放进
  你的 assistant（例如 `.claude/skills/`），然后只管说出你想要什么。

所以无论 LLM 是在**读取**你的文档还是在**构建**它们，你都不必
亲自去做翻译 —— 把它指向配套的 `.md` 和那个 skill 即可。
