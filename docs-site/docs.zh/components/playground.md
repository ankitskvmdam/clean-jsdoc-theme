---
title: Playground
group: Components
order: 2
---

# Playground

在本指南中，你将让读者无需离开文档即可运行你的示例。开启 **playground** 功能后，
代码块的 header 会多出一个 **"Open Code in"** 按钮，可在 **CodePen**、**JSFiddle**
或 **CodeSandbox** 中打开预填好的代码。一切都发生在读者的浏览器中（对 CodePen/JSFiddle
是一次表单 `POST`，对 CodeSandbox 是一个参数化链接）—— **没有后端，没有 API key**。

同一个 `@playground` tag 还给你两个**无论是否**配置 providers 都有效的呈现细节：一个
**`filename`** header 标签，以及行 **`highlight`**（高亮）。

## 1. 开启它

在你向 `jsdoc.json` 的 `opts` 中添加 `playground` 之前，该功能都是**关闭**的。
简写 `true` 会以默认值开启它（所有 provider，且每个示例需主动启用）；对象形式
则给你控制权：

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  playground: {
    // Turn every @example into a playground (default false → opt-in per tag).
    enableForAllExamples: false,
    // Which providers to offer, in this order (default: all three).
    providers: ["codepen", "jsfiddle", "codesandbox"],
    // Site-wide per-provider options (see "Set provider options" below).
    codepen: { js_pre_processor: "babel", css_external: "https://unpkg.com/some.css" },
    jsfiddle: { resources: "https://unpkg.com/some.js", wrap: "b" },
    codesandbox: { dependencies: { lodash: "latest" } }
  }
}
```

需要知道的几点：

- `playground: false`（或省略它）会让输出保持**逐字节相同** —— 代码块的渲染
  与之前完全一样。
- `enableForAllExamples: true` 会让**每一个** `@example` 都启用（某个示例仍可用
  `@playground none` 退出）。
- `providers` 设置默认集合 + 顺序。省略它则为全部三个。

## 2. 给一个示例打 tag

在一条 doc comment 中、在某个 `@example` 旁边添加 `@playground`。其语法是一个由
空白字符分隔的 token 列表（与 [`@iframe`](/components/embeds) 使用同一个 parser）：

```js
/**
 * Resize an image to a target width.
 *
 * @example
 * const out = resize(img, 200);
 * render(out);
 * @playground codepen jsfiddle filename=resize.js highlight=2
 */
export function resize(img, width) {}
```

| Token | What it does |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | 只提供这些 provider（保留你的顺序）。 |
| *(裸 `@playground`)* | 使用来自 `opts.playground` 的默认 `providers`。 |
| `none` / `off` | 让此示例**退出**（与 `enableForAllExamples` 搭配很方便）。 |
| `filename=<name>` | 将 `<name>` 显示为 header 标签，而非 `CODE`。 |
| `highlight=1,4,8` | 高亮第 1、4 和 8 行（从 1 开始）。`highlight=[1,4,8]` 也有效。 |

`filename` 和 `highlight` 即使在 `none`/无 provider 的情况下也会生效 —— 因此你可以
为一个片段加标签和高亮，而完全不提供 playground。

> [!IMPORTANT]
> 对基础 JSDoc 而言，`@playground` 是一个 **unknown tag**，因此请在你的 `jsdoc.json`
> 中设置 `tags.allowUnknownTags: true`（与 `@iframe` 需要的是同一个 flag）—— 否则
> JSDoc 会在主题运行之前将其剥离。TypeDoc 不需要这样的 flag。

## 3. 在正文中使用它

在 doc comments 之外 —— 在你的 `docs` 文件夹、tutorials 或 README 中 —— 因为正文
的处理方式不同，所以有两种编写形式：

**` ```js playground ` fence** 在 `docs` 目录和 **Markdown** tutorials 中有效。
把 `playground`（加上任意 token）放在 fence info string 中语言之后：

````markdown
```js playground codepen filename=demo.js highlight=2
const out = resize(img, 200);
render(out);
```
````

**`<playground>` container** 在**任何地方**都有效，包括 README 和 HTML tutorials。
包裹一个 fenced 代码块：

````markdown
<playground codepen jsfiddle filename="demo.js" highlight="2">

```js
const out = resize(img, 200);
render(out);
```

</playground>
````

> [!TIP]
> **为什么有两种形式？** 当 README/HTML 正文被规范化时，fence info string 中语言
> 之后的部分（即 “meta”）会被丢弃，所以 fence 形式只对以原始 Markdown 形式到达的
> source（`docs`、Markdown tutorials）有效。而 `<playground>` container 能在那次
> 规范化中存活下来，因此在 README 中请使用它。请在内部 fence 周围留一个空行
> （与 [`<steps>`/`<tabs>`](/components/steps) 的规则相同）。

一个裸的正文 `playground`（没有 provider token）会提供**所有** provider —— 正文
无法访问站点级的 `providers` 默认值。

## 4. 设置 provider 选项

`opts.playground` 中各 provider 的记录会被直接传给各服务的预填 API，并应用于站点上
的**每一个** playground：

- **CodePen** —— [`/pen/define` 预填](https://blog.codepen.io/documentation/prefill/)
  字段：`js_pre_processor`、`js_external`、`css`、`css_external`、`html`、
  `editors`、`layout`、`title`……示例代码会成为该 pen 的 JS。
- **JSFiddle** —— [post API](https://docs.jsfiddle.net/api/display-a-fiddle-from-post)
  字段：`resources`（逗号分隔的外部 URL）、`wrap`、`html`、`css`、
  `title`、`description`。
- **CodeSandbox** —— [define API](https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api)：
  `dependencies` 用于初始化 `package.json`；示例会成为 `index.js`。

要为 header 条或高亮行的着色重新配色，请在
[`colors` / `darkColors`](/theme/configuration#colors-and-darkcolors) 下设置
`codeHeaderBg` / `codeHeaderFg` / `codeHighlightBg` 键。

## See also

- [Custom tags](/components/overview) —— `@playground` 与 `@iframe` /
  `@category` / `@order` 并列，以及 `allowUnknownTags` 要求。
- [Embeds & live demos](/components/embeds) —— `@iframe` / ` ```iframe `，用于
  通过 URL 嵌入一个**现成的** pen、视频或实时演示。
