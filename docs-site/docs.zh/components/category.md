---
title: "@category"
group: Components
order: 8
---

# `@category` —— 在侧边栏中为一个 symbol 分组

`@category` 把一个 symbol 生成的页面放入一个明确的侧边栏 group，而不是其默认的
**kind section**（Classes、Modules、Namespaces……）：

```ts
/**
 * @category Core
 */
export class Parser {}
```

现在 `Parser` 位于一个 **Core** group 之下，而不是 **Classes** 之下。

> [!IMPORTANT]
> `@category` 是一个 unknown tag —— 请在你的 `jsdoc.json` 中设置
> `tags.allowUnknownTags: true`，否则 JSDoc 会在主题运行之前将其剥离。参见
> [overview](/components/overview)。（TypeDoc 不需要 flag。）

## path 语法

`parseCategory`（位于
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中）把 tag text 按空白字符拆分，然后：

- 普通 token 的**前导序列**就是 **group path**，**以单个空格连接**。
- 解析在第一个含有 `=` 的 token 处切换为 **options**。从那里开始的所有内容
  都是 `key=value`。
- 字面上的 **`/`** 才是真正**嵌套**一个 group 的东西。空格**不会**嵌套。

### 空格保留在名称中；`/` 进行嵌套

这是微妙的部分。空格只是 group 名称的一部分 —— 只有 `/` 才会创建一个
parent ▸ child 关系。

```ts
/** @category Getting Started */
export class Intro {}
```

→ 一个扁平的 group，其名称字面上就是 **Getting Started**（空格被保留）。

```ts
/** @category Core/Parsing */
export class Lexer {}
```

→ 把页面嵌套到 **Core ▸ Parsing** 之下。

你可以嵌套到任意深度 —— `@category Core/Parsing/Internals` →
**Core ▸ Parsing ▸ Internals**。

### 第一个 `@category` 胜出

如果一个 symbol 携带多个 `@category`，则使用**第一个**；其余的会被忽略。

## 行内 `order=`

目前 `@category` 唯一的 option 是 `order` —— 即 within-group 的**排序键**：

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}

/** @category Core/Parsing order=2 */
export class Token {}
```

在 **Core ▸ Parsing** 内部，`Lexer` 排在 `Token` 之前。path 是前导 token；options
跟在第一个 `=` 之后，所以 `Getting Started order=1` 是 group **Getting Started**
带 `order=1`。

> [!NOTE]
> **缺失或非数字**的 `order` 会被保留为 undefined —— 该页面随后会按字母顺序排在
> **最后**，就像一个未加 tag 的页面。

## 实例演示

```ts
/** @category Core */
export class A {}                 // → Core

/** @category Core/Schema order=1 */
export class Point {}             // → Core ▸ Schema, first

/** @category Data Pipeline */
export class Stage {}             // → "Data Pipeline" (one group; space kept)

/** @category Advanced/Internals order=10 */
export class Cache {}             // → Advanced ▸ Internals, order 10
```

## 与 `@order` 组合

`@category` 上的行内 `order=` 和独立的 [`@order`](/components/order) tag 都馈入
同一个排序键。当一个 symbol **同时**拥有两者时，行内的
`@category … order=` **胜出** —— 参见
[`@order` 页面上的优先级规则](/components/order#precedence-category--order-wins)。

## 它如何塑造侧边栏

`@category` 是主题单一侧边栏排序引擎中的一个杠杆 —— 每个 entry 都携带一个
`group` path 和一个可选的 `order`。其正文对应物是一个 guide 页面的
**`group` frontmatter**（同样的 `/`-嵌套规则）。完整的模型 —— 嵌套的 path、
leaf-vs-branch 排序、`clubSidebarItems`、`sectionOrder`、`docGroups` 和 `menu`
—— 位于 [Structure your sidebar](/guides/structure-your-sidebar)。

## See also

- [Components overview](/components/overview) —— 完整的 tag 列表 +
  `allowUnknownTags`。
- [`@order`](/components/order) —— 在没有 category 的情况下为 symbol 排序。
- [Structure your sidebar](/guides/structure-your-sidebar) —— group 与 order 如何组合。
