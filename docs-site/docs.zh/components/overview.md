---
title: Overview
group: Components
order: 1
---

# 自定义标签

> [!NOTE]
> **它在哪里生效 —— source comments。** 这些是 JSDoc/TypeDoc 的 doc-comment
> tags，写在你的 source 中。Prose pages 有对应的等价物：`group` / `order`
> frontmatter 对应 `@category` / `@order`，而 ` ```iframe ` fence 对应
> `@iframe`（参见 [Embeds](/guides/embeds)）。

主题会读取一些基础 JSDoc 和 TypeDoc 不提供的 doc-comment block tags。它们塑造
侧边栏，并让 source comments 能够嵌入实时演示：

- **`@category <path> [order=N]`** —— 把一个 symbol 的页面放入一个明确的侧边栏
  group（并可选地为其排序）。
- **`@order N`** —— 适用于任何 symbol 的独立 within-group 排序键。
- **`@iframe <url> key=value`** —— 从 source comment 嵌入一个实时演示。

Category/order 解析位于
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
（`parseCategory` / `readOrder`）；`@iframe` 在
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
中处理。

> [!IMPORTANT]
> 这三个都是 **unknown tags** —— 基础 JSDoc 并不定义它们。你的 config
> 必须在 `jsdoc.json` 中设置 `tags.allowUnknownTags: true`（本站点的
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> 就是这样做的）。否则 JSDoc 会在主题运行之前就把这些 tags 剥离掉。

## `@category` —— 为一个 symbol 分组

`@category` 把一个 symbol 生成的页面放入一个明确的侧边栏 group，而不是其默认的
kind section（Classes、Modules、…）：

```ts
/**
 * @category Core
 */
export class Parser {}
```

### Path tokens 以空格连接；只有 `/` 进行嵌套

这是微妙的部分，值得正确理解。`parseCategory` 把 tag text 按空白字符拆分，然后：

- 普通 tokens 的**前导序列**就是 **group path**，**以单个空格连接**。所以
  `@category Getting Started` 是一个扁平的 group，其名称字面上就是
  `Getting Started` —— 空格仍是名称的一部分。
- 解析在第一个含有 `=` 的 token 处切换为 **options**。从那里开始的所有内容
  都是 `key=value`。
- 字面上的 **`/`** 才是真正**嵌套**一个 group 的东西 —— `Core/Parsing` 会把页面
  嵌套到 **Core ▸ Parsing** 之下。空格不会嵌套。

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

这会把 `Lexer` 放到 **Core ▸ Parsing** 之下，并在该 subgroup 中排在最前。一个
symbol 上的第一个 `@category` 胜出。

### 行内 `order=`

目前 `@category` 唯一的 option 是 `order` —— 即 within-group 排序键。缺失或非数字
的 `order` 会被保留为 undefined（该页面会排在最后，按字母顺序排列，就像一个
未加 tag 的页面）。

## `@order` —— 为任何 symbol 排序

行内 `order=` option 只适用于**拥有** `@category` 的 symbol。要为一个位于其
**kind section** 中的 symbol 定位 —— 即没有 category 的普通 `@module`、`@class`、
`@namespace` —— 请使用独立的 `@order` tag：

```ts
/**
 * @module config
 * @order 1
 */
```

缺失或非数字的值会被保留为 undefined（排在最后）。参见
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中的 `readOrder`。

### 优先级：`@category … order=` 胜过 `@order`

当一个 symbol **同时**携带 `@category … order=` option 和独立的 `@order` 时，
行内 `@category` order **胜出** —— 它是更具体、共处一处的声明。解析得到的 order
在 `renderContainerPage` 中按 `category?.order ?? readOrder(doclet)` 计算。两者
都馈入侧边栏所读取的同一个 `frontmatter.order`。

```ts
/**
 * `order=1` (from @category) wins; the @order 9 below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

## `@iframe` —— 从 source 嵌入实时演示

`@iframe` 直接从一个 doc comment 嵌入一个 sandboxed iframe，使用与 prose
` ```iframe ` fence 相同的语法：

```js
/**
 * @iframe https://example.com/embed/demo title="Live demo" height=420
 */
export function render() {}
```

每个有效的 `@iframe` 会在 symbol 的 `@example` section 之后渲染一个 `<Embed>`；
无效的 configs（非 `https`、无 URL）会被丢弃。完整的 config 语法 —— 接受的 URL
schemes、每个 option，以及 `themed` / `{theme}` 行为 —— 都记录在
[Embeds & live demos](/guides/embeds) 上。

## `@category` 和 `@order` 如何塑造侧边栏

这些 tags 是馈入主题单一侧边栏排序引擎的两个杠杆 —— 每个 entry 都携带一个
`group` path 和一个可选的 `order`。
[Structure your sidebar](/guides/structure-your-sidebar) 涵盖了完整的模型：
嵌套的 `/`-paths、leaf-vs-branch 排序、`clubSidebarItems`、`sectionOrder`、
`docGroups` 和 `menu`。本页只讲 tag 语法；那一页讲各部分如何组合。

## 参见

- [Structure your sidebar](/guides/structure-your-sidebar) —— 完整的侧边栏
  排序模型。
- [Embeds & live demos](/guides/embeds) —— 完整的 `@iframe` config 语法。
- [Configuration](/theme/configuration) —— `sectionOrder`、`docGroups` 及相关项。
- [Build a guides site](/guides/build-a-guides-site) —— guide-page frontmatter
  （`group` / `order`），即这些 tags 的 prose 对应物。
