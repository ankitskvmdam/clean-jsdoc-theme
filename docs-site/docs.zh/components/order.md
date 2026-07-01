---
title: "@order"
group: Components
order: 7
---

# `@order` —— 在 group 内为任何 symbol 排序

`@order N` 是适用于任何 symbol 的独立 **within-group 排序键**。行内的
[`@category … order=`](/components/category#inline-order) 只适用于**拥有**
`@category` 的 symbol；而 `@order` 对位于其普通 **kind section** 中的 symbol
同样有效 —— 即一个没有 category 的 `@module`、`@class`、`@namespace` 等：

```ts
/**
 * @module config
 * @order 1
 */
```

现在 `config` 在 **Modules** section 的各模块中排在最前，而不是回退到字母顺序。

> [!IMPORTANT]
> `@order` 是一个 unknown tag —— 请在你的 `jsdoc.json` 中设置
> `tags.allowUnknownTags: true`，否则 JSDoc 会将其剥离。参见
> [overview](/components/overview)。（TypeDoc 不需要 flag。）

> [!NOTE]
> 这个排序键适用于 **JSDoc** 侧边栏。`@order` 对 TypeDoc API 侧边栏没有
> 任何效果 —— 在一个 module 内部，成员是按 kind 排序、然后按字母顺序
> 排序的，而不是按 `@order`。见
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar)。

## 何时使用哪一个

| Situation | Use |
| --- | --- |
| 该 symbol 拥有一个 `@category` | 在该 `@category` 上**行内**使用 `order=N` |
| 该 symbol 位于其 kind section 中（无 category） | 独立的 `@order N` |
| 该 symbol 两者都有 | 两者都会被读取 —— 见下方的优先级 |

**缺失或非数字**的值会被保留为 undefined，因此该 symbol 会（按字母顺序）排在
**最后**。`@order` 由
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中的 `readOrder` 读取。

## 优先级：`@category … order=` 胜出

当一个 symbol **同时**携带一个 `@category … order=` option **和**一个独立的
`@order` 时，行内的 `@category` order **胜出** —— 它是更具体、共处一处的声明。
解析得到的值在 `renderContainerPage` 中按 `category?.order ?? readOrder(doclet)`
计算，两者都馈入侧边栏所读取的同一个 `frontmatter.order`。

```ts
/**
 * `order=1` (from @category) wins; the `@order 9` below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

所以，正是在**没有** category 可供挂上 `order=` 时，才该使用独立的 `@order`。

## 正文对应物

在一个 guide 页面（正文）上，其等价物是 **`order` frontmatter** 字段，它在页面的
`group` 内对页面排序，方式与 `@order` 为 symbol 排序完全相同 —— 参见
[Build a guides site](/guides/build-a-guides-site)。

## See also

- [Components overview](/components/overview) —— 完整的 tag 列表 +
  `allowUnknownTags`。
- [`@category`](/components/category) —— 分组（以及行内 `order=`）。
- [Structure your sidebar](/guides/structure-your-sidebar) —— 完整的排序模型。
