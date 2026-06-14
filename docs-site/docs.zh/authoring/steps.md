---
title: 步骤
group: Authoring
order: 2
---

# 步骤

> [!NOTE]
> **它在哪里生效——prose 与 source comments。** 在任何 prose（README、tutorials、docs
> 目录）中编写 `<steps>` markup，**或者**直接在 JSDoc / TypeDoc comment
> **description** 中编写——两者都流经同一个 converter。没有专用的 block tag；你在两处
> 编写的是相同的 markup。

`<steps>` 渲染一个垂直的有序的 stepper——就是 docs 站点用于 install / configure /
build 流程的那种 "1, 2, 3" 演练。你在 prose 中（或在 doc-comment description 中）
编写小写的 `<steps>` / `<step>` tags；主题会将它们重写为 rang 渲染的首字母大写的
`<Steps>` / `<Step>` components。

这种重写发生在 raw-string 层级，位于
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
（`splitContainers` / `parseItems` / `expandContainers`），早于那个原本会剥离这些
自定义 tags 的 HTML round-trip。Components 位于
[`Steps.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)。

> [!TIP]
> 想实时看到 steps 的效果吗？[JSDoc Getting Started](/theme/jsdoc-getting-started) 和
> [TypeDoc Getting Started](/theme/typedoc-getting-started) 页面将其 install 演练
> 布置为 steppers——在 GitHub 上查看任一页面的 source，即可获得一个真实、可复制的
> 示例。

## Syntax

一个 `<steps>` container 包裹一个或多个 `<step>` items。每个 step 接受一个
**可选的** `label` attribute——显示在 step body 上方的 bold heading：

````markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build command and open the output.

</step>

</steps>
````

> [!IMPORTANT]
> 在每个 step 的内部 content（fenced code、lists、paragraphs）**周围留一个空行**。
> 每个 step 的 body 会被重新作为 Markdown 来 parse（`expandContainers` 将其重新
> route 回 converter），因此正是这些空行让 content 能够正确地 parse。

## Attributes

只读取一个 attribute，且仅在 `<step>` 上：

| Tag       | Attribute | Effect |
| --------- | --------- | ------ |
| `<step>`  | `label`   | step body 上方的可选 bold heading。省略它则为无标签的 step。 |

`readAttr` 接受 single 或 double quotes（`label="…"` 或 `label='…'`）。位于
`<steps>` 之外的 `<step>` 不渲染任何内容——`Step` 是一个逻辑 marker，`Steps`
直接从中读取其 props；一个游离的 `<step>` 返回 `null` 而不是泄漏 markup。

`Steps` 是 **SSR-only** 的 static markup——没有 client JavaScript，也没有 hydration
island。它是纯粹的 layout。

## 嵌套其他 components

一个 step 的 body 会被递归地重新 parse，因此你可以在一个 step 内部嵌套
**callouts**、**tabs**、code blocks，甚至另一个 `<steps>`：

````markdown
<steps>

<step label="Choose your package manager">

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Heads up">

> [!TIP]
> Callouts work inside steps too.

</step>

</steps>
````

这与 [JSDoc Getting Started](/theme/jsdoc-getting-started) 演练所使用的是同一种
pattern——一个嵌套在 `<step>` 内部的 `<tabs>` block。

## 一个真实示例，位于 doc comment 中

相同的 markup 在 JSDoc / TypeDoc **description** 中同样有效。下面是驱动实时 demo 的
`@module` comment——一个关于 `Cache` class 的三步演练，带有一个 `<tabs>` install
block 和一个 `[!INFO]` callout：

`````js
/**
 * A small, fully-documented sample module …
 *
 * > [!INFO]
 * > Everything below is authored inline in the `@module` doc comment.
 *
 * ## Quick start
 *
 * <steps>
 *
 * <step label="Initialize the cache">
 *
 * Create a {@link Cache}, optionally capping how many entries it holds:
 *
 * ```js
 * const cache = new Cache({ maxSize: 2 });
 * ```
 *
 * </step>
 *
 * <step label="Store some values">
 *
 * `set()` returns the cache, so calls chain:
 *
 * ```js
 * cache.set('a', 1).set('b', 2);
 * ```
 *
 * </step>
 *
 * <step label="Read them back">
 *
 * ```js
 * cache.get('a'); // => 1
 * ```
 *
 * </step>
 *
 * </steps>
 *
 * @module sample-api
 */
`````

> [!TIP]
> 在实时 API demo 中的
> **[sample-api module page](/api-docs/module/sample-api)** 上查看它的渲染效果——
> 它从
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> 逐字生成。

## 另请参阅

- [Tabs](/authoring/tabs)——同级的 tabbed-view container。
- [Callouts](/authoring/callouts)——用于 `[!NOTE]` 风格的 notices。
- [Build a guides site](/guides/build-a-guides-site)——了解 prose 页面所在之处。
