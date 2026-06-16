---
title: 标签页
group: Components
order: 4
---

# 标签页

> [!NOTE]
> **它在哪里生效——prose 与 source comments。** 在任意 prose（README、tutorials、docs
> 目录）中编写 `<tabs>` markup，**或者**直接写在 JSDoc / TypeDoc comment 的
> **description** 中——两者都流经同一个 converter。没有专门的 block tag；你在任意位置都写
> 相同的 markup。

`<tabs>` 渲染一个标签页视图——一排可点击的标签页按钮位于一组面板之上，每次显示一个面板。你在
prose 中（或在 doc-comment description 中）编写小写的 `<tabs>` / `<tab>` tags；主题会将它们重写
为 rang 渲染的首字母大写的 `<Tabs>` / `<Tab>` components。

该重写发生在 raw-string 层级，位于
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
（`splitContainers` / `parseItems`）中，发生在会剥离这些自定义 tags 的 HTML round-trip 之前。该
component 位于
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
中。

> [!TIP]
> 想看标签页的实际效果？整个 [Configuration](/theme/configuration) 页面都是用它们构建的——每个
> 选项的代码片段都是一个同步的 JSDoc/TypeDoc 标签页组。
> [JSDoc](/theme/jsdoc-getting-started) 和 [TypeDoc](/theme/typedoc-getting-started)
> getting-started 页面也使用了它们。在 GitHub 上查看其中任意页面的源码，即可获得一个真实、可复制的
> 示例。

## 语法

一个 `<tabs>` container 包裹一个或多个 `<tab>` items，每个都带有一个 `label`：

````markdown
<tabs>

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

> [!IMPORTANT]
> 在每个标签页的内部内容（fenced code、lists、paragraphs）**周围留一个空行**。每个 item 的正文都会
> 作为 Markdown 重新 parse，所以正是这些空行让内容能够正确渲染。

## 属性

| Tag      | Attribute | Effect |
| -------- | --------- | ------ |
| `<tab>`  | `label`   | 标签页按钮文本。省略时回退为 `Tab N`。 |
| `<tab>`  | `value`   | 跨块的**同步键**（见下文）。默认为归一化后的 label（小写、去除首尾空格）。 |
| `<tabs>` | `group`   | 将整个块纳入共享 group 名下的跨块同步。 |

`readAttr` 接受单引号或双引号。位于 `<tabs>` 之外的 `<tab>` 不渲染任何内容——`Tab` 是一个逻辑
marker，由 `Tabs` 直接读取。

标签页栏完全由 SSR 渲染（第一个标签页可见，其余为 `hidden`），带有真正的 ARIA tablist + panels。
一个小型 `tabs` island 仅仅**增强**该 markup——它在点击和键盘导航时切换 `aria-selected` /
`tabIndex` / `hidden`。它不会通过 Preact 重新渲染面板，因此面板内容可以是任意已渲染的 MDX。

## 在整个页面范围内同步标签页组 — `group`

给多个 `<tabs>` 块赋予相同的 `group`，它们就会同步：切换其中一个，页面上所有其他分组的块都会随之
切换（按每个标签页的 `value` 匹配），并且该选择会保留到下次访问。

`value` 是在一个 group 内匹配标签页所依据的键。当你省略它时，它默认为归一化后的 label（小写并去除
首尾空格，依据
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
中的 `tabValue`），因此**相同的 labels 会自动同步**。当 labels 在大小写或措辞上不同但仍应同步时，
请设置一个显式的 `value`。

````markdown
<tabs group="pm">

<tab label="npm" value="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm" value="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

给同一页面上的另一个 `<tabs>` 块赋予相同的 `group`，两者就会保持同步——在其中一个里选择一个标签页，
其他每个分组的块都会跟随。这正是 [Configuration](/theme/configuration) 用来让其 JSDoc-与-TypeDoc
代码片段保持同步的机制：每个选项的标签页都共享 `group="tool"`，因此一次选择 “TypeDoc” 就会切换整个
页面。

## 在 doc comment 中

`<tabs>` 在 JSDoc / TypeDoc **description** 中同样有效。在线演示的 module 页面上的安装标签页就是
直接写在其 `@module` comment 中的：

`````js
/**
 * Install it with your package manager of choice:
 *
 * <tabs>
 *
 * <tab label="npm">
 *
 * ```sh
 * npm install --save-dev jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="pnpm">
 *
 * ```sh
 * pnpm add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * </tabs>
 *
 * @module sample-api
 */
`````

> [!TIP]
> 在在线演示的
> **[sample-api module page](/api-docs/module/sample-api)**
> 上查看这些标签页的渲染效果——源码位于
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)。

## 另请参阅

- [Steps](/components/steps) —— 同级的步骤容器（你可以在某个 step 内嵌套标签页）。
- [Callouts](/components/callouts) —— 用于 `[!NOTE]` 风格的提示。
- [Structure your sidebar](/guides/structure-your-sidebar) —— 了解指南页面如何分组。
