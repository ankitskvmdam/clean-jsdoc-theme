---
title: Overview
group: Components
order: 1
---

# Components

在**编写**文档时你会用到的构建块 —— 既用于正文（你的 README、tutorials 和 `docs`
文件），也用于 JSDoc / TypeDoc doc comments。它们分为两类：

- **Visual components** —— 你放进正文或 comment 的标记，会渲染为更丰富的 UI 元素
  （callouts、steppers、tabs、实时 embeds、可运行的 playgrounds）。
- **Custom tags** —— 基础 JSDoc/TypeDoc 并不定义的 doc-comment block tags，主题会读取
  它们来塑造侧边栏，或从你的代码嵌入实时内容。

## Visual components

在正文和 doc-comment descriptions 中以相同方式编写（它们经由同一个 converter 流转）：

| Component | What it does | Page |
| --- | --- | --- |
| **Callouts** | Note / tip / warning / error 提示框（GitHub 风格的 `> [!TIP]`）。 | [Callouts](/components/callouts) |
| **Steps** | 一个带编号的 `<steps>` / `<step>` stepper。 | [Steps](/components/steps) |
| **Tabs** | 一个带标签页的 `<tabs>` / `<tab>` 视图。 | [Tabs](/components/tabs) |
| **Embeds** | 一个沙箱化的 `<iframe>` 实时演示 —— 一个 ` ```iframe ` fence 或 `@iframe` tag。 | [Embeds](/components/embeds) |
| **Playgrounds** | 从一个 `@example` 或代码 fence “在 CodePen / JSFiddle / CodeSandbox 中打开”。 | [Playground](/components/playground) |

## Custom tags

基础 JSDoc 和 TypeDoc 并不定义的 block tags —— 主题会从你的 source comments 中读取它们。
其中两个塑造侧边栏；另外两个嵌入实时内容（并且有正文等价物）：

| Tag | What it does | Page |
| --- | --- | --- |
| `@category <path> [order=N]` | 把一个 symbol 的页面放入一个明确的侧边栏 group（并可选地为其排序）。 | [@category](/components/category) |
| `@order N` | 适用于**任何** symbol 的独立 within-group 排序键。 | [@order](/components/order) |
| `@iframe <url> key=value` | 从一条 source comment 嵌入一个沙箱化的实时演示。 | [Embeds](/components/embeds) |
| `@playground <providers> [filename=] [highlight=]` | 在一个实时 playground 中打开一个 `@example`。 | [Playground](/components/playground) |

### 先启用 custom tags —— `allowUnknownTags`

只有**一个**设置步骤，而它正是这些 tags “不起作用”的最常见原因：基础 JSDoc 会在主题
运行**之前**就把任何它无法识别的 tag 剥离掉。在你的 `jsdoc.json` 中开启 unknown tags：

```json
{
  "tags": { "allowUnknownTags": true }
}
```

没有它，`@category` 会塌缩为默认的 kind sections，`@order` 不起任何作用，而 `@iframe` /
`@playground` 永远不会渲染 —— 而且是静默的。本站点的
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
就设置了它。

> [!NOTE]
> **TypeDoc 不需要这样的 flag** —— 它会原样传递这些 tags。`allowUnknownTags`
> 这一要求仅针对 JSDoc。

## Tags vs. prose —— 两种入口

custom tags 是 **source-comment** 形式。当你改为编写正文时（一个 README、一个 tutorial，
或一个 `docs` 文件），无需 tags 也能获得相同的能力：

- **`group` / `order` frontmatter** 在 guide 页面上对应 `@category` / `@order`
  （参见 [Build a guides site](/guides/build-a-guides-site)）。
- ` ```iframe ` **fence** 对应 `@iframe`（参见 [Embeds](/components/embeds)）。
- ` ```js playground ` **fence** 和 `<playground>` **container** 对应
  `@playground`（参见 [Playground](/components/playground)）。

## See also

- [Structure your sidebar](/guides/structure-your-sidebar) —— `@category` /
  `@order` 如何与 `sectionOrder`、`docGroups`、`clubSidebarItems` 和 `menu` 组合。
- [Embeds](/components/embeds) —— 完整的共享 `@iframe` / ` ```iframe `
  config 语法。
- [Playground](/components/playground) —— 完整的 `@playground` 功能：
  `opts.playground`、正文形式，以及各 provider 的选项。
