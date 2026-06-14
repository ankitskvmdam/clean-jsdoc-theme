---
title: 提示框
group: Authoring
order: 1
---

# 提示框

> [!NOTE]
> **它在哪里生效 —— prose 与 API docs。** 你可以在任何 prose（README、
> tutorials、docs directory）中编写 callouts，并且 theme 还会从你 source 中的
> `@deprecated` doc-comment tag 自动生成一个 callout。

Callouts 是带类型、带颜色的通知框 —— 就像你为某个 tip、warning 或某条重要的旁注
所使用的那种。你将它们写成 **GitHub-style alert blockquotes**：一个普通的
blockquote，其第一行是一个 `[!TYPE]` marker。

它在 theme 渲染的任何 prose 中都生效 —— 你的 README、tutorials 以及 docs
directory —— 因为这种提升发生在共享的 HTML normalization pass 期间，位于
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
中。

## Syntax

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming.
```

渲染为：

> [!NOTE]
> Useful information that users should know, even when skimming.

Marker 必须是 blockquote 内部最前面的内容（`blockquoteToCallout`
从第一个 text node 读取它，并用 `^\s*\[!(\w+)\]\s*` 进行匹配）。Marker
会从 body 中被剥离；其后的所有内容都会成为 callout content。一个缺失或
无法识别的 marker 会让 blockquote 保持为一个普通 quote。

## 四种 variants 及其 markers

恰好有 **四** 种 callout variants —— `info`、`tip`、`warning` 和 `error`。多个
GitHub-style keywords 各自折叠到其中之一。这是
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
中完整的 `CALLOUT_ALERTS` map；marker 是 **case-insensitive** 的（在 lookup
之前会先被转为小写）：

| Marker you write | Variant |
| ---------------- | ------- |
| `[!INFO]`        | info    |
| `[!NOTE]`        | info    |
| `[!IMPORTANT]`   | info    |
| `[!TIP]`         | tip     |
| `[!SUCCESS]`     | tip     |
| `[!WARNING]`     | warning |
| `[!CAUTION]`     | warning |
| `[!ERROR]`       | error   |
| `[!DANGER]`      | error   |

因此 `[!NOTE]` 和 `[!IMPORTANT]` 都会生成蓝色的 **info** 框，`[!TIP]`
和 `[!SUCCESS]` 生成绿色的 **tip** 框，`[!WARNING]` 和 `[!CAUTION]` 生成
**warning**，而 `[!ERROR]` 和 `[!DANGER]` 生成 **error**。没有单独的
"caution" 或 "danger" 颜色 —— 它们 alias 到 warning 和 error 上。

## 每一种 variant 的渲染效果

### Info — `[!INFO]`, `[!NOTE]`, `[!IMPORTANT]`

```markdown
> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.
```

> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.

### Tip — `[!TIP]`, `[!SUCCESS]`

```markdown
> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.
```

> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.

### Warning — `[!WARNING]`, `[!CAUTION]`

```markdown
> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.
```

> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.

### Error — `[!ERROR]`, `[!DANGER]`

```markdown
> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.
```

> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.

## 丰富内容与 nesting

Body 是普通的 Markdown —— paragraphs、lists、code、links —— 并且 callouts
会在 **任意深度** 提升，包括在 list items 内部，这正好对应 GitHub
渲染嵌套在 lists 中的 alerts 的方式（`promoteCallouts` 会递归遍历 children）：

```markdown
> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```
```

> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```

## 来自 doc-comment tags 的 Callouts

Callouts 不仅仅是一项 prose 功能。当你用 **`@deprecated`** 来 document 某个
symbol 时，theme 会自动生成一个 callout —— 无需任何 marker。参见
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
中的 `deprecationBlock`：

```js
/**
 * @deprecated Use {@link newApi} instead.
 */
```

一个没有任何原因的裸 `@deprecated` 会回退到一个 kind-aware 的默认句子
（"This method is deprecated and should not be used."），因此该框永远不会为空。

你也可以把 **alert markers 本身** 直接写进某个 description —— 它们会像在 prose
中一样被提升：

````js
/**
 * Cache statistics.
 *
 * > [!INFO]
 * > Counts reset when you call `clear()`.
 *
 * > [!WARNING]
 * > `get()` mutates recency — avoid it in hot loops.
 */
````

> [!TIP]
> 在 live demo 的 **[sample-api module page](/api-docs/module/sample-api)** 上
> 查看一个写在真实 `@module` comment 中的 `[!INFO]` callout —— source 位于
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)。

## 幕后原理

一个 callout 会被生成为一个首字母大写的 `<Callout type="…">` MDX JSX node
（[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
中的 `callout` builder）。rang 在
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
中将 `Callout` → `MdxBlockquote` 进行 register，因此一个 callout 和一个普通的
markdown blockquote 共享同一个 component —— 它只是在 `type` 被设置时分支到 typed
styling。正是这个首字母大写的名称，让 variant 在 serialization 到 dwar 期间得以保留
（一个普通的 `>` quote 无法承载它）。

## 另请参阅

- [Steps](/authoring/steps) 和 [Tabs](/authoring/tabs) —— 其他 prose authoring
  containers。
- [Embeds & live demos](/authoring/embeds) —— 用于 `<Embed>` / `@iframe`。
- [Custom tags](/authoring/custom-tags) —— 用于 `@category`、`@order` 和 `@iframe`。
