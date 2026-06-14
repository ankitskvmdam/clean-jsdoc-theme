---
title: 概览
group: Using the Theme
order: 1
---

# 概览

`clean-jsdoc-theme` 将一个 **JSDoc** 或 **TypeDoc** 项目转变为一个快速、现代、
对 LLM 友好的文档站点。你将它指向自己的源码注释——以及，可选地，
一个存放 Markdown 指南的文件夹——它便会生成服务端渲染的 HTML、
延迟 hydration 的交互式 island、模糊搜索 + 全文搜索、浅色和深色主题，
以及每个页面对应的配套 `.md`。

它并不是单一的模板。在底层，它是一组职责单一的
[包](/#the-packages)，被串联进一条单向管道，因此
同一套核心既驱动 JSDoc 也驱动 TypeDoc 入口。

## 工作原理

<steps>

<step label="Document your code">

像平常一样编写 JSDoc 或 TypeDoc 注释——可选地搭配一个
存放手写 Markdown 指南的文件夹。

</step>

<step label="Point your tool at the theme">

将主题添加到你的 `jsdoc.json` 或 `typedoc.json` 中。无需任何 CSS 或构建
配置即可开始使用。

</step>

<step label="Build">

运行 JSDoc 或 TypeDoc。主题会构建出一个完整的静态站点——HTML、island、
一个搜索索引，以及每个页面对应的配套 `.md`——可随时部署到任何地方。

</step>

</steps>

## 谁应该使用 clean-jsdoc-theme

- **JSDoc 用户**，想要一个现代、响应式、可搜索的站点来取代
  默认模板——无需任何 CSS 或构建配置即可开始使用。
- **TypeScript / TypeDoc 用户**，想要从他们现有的
  基于反射的文档中获得同样的输出。
- **库作者**，想要让手写的 Markdown 指南和一份
  自动生成的 API 参考共存于**同一个**站点、同一个侧边栏、同一个搜索之中。
- **关注 AI 的团队**，想要让每个页面都附带一份干净的配套
  `.md`，使助手和 LLM 能像人一样轻松地阅读文档。
- **需要本地化的项目**，想要以多种语言发布他们的文档——翻译后的 UI、
  API 描述和正文，每个 locale 一个静态站点，并配有一个语言切换器。
  参见 [本地化你的文档](/guides/localize-your-docs)。

## 找到你的方向

- **入门** — [JSDoc](/theme/jsdoc-getting-started) 或
  [TypeDoc](/theme/typedoc-getting-started)：安装主题并构建你的第一个站点。
- **[配置](/theme/configuration)** — 每一个主题选项，并排展示 JSDoc 和
  TypeDoc 两种形式。
- **指南** — [构建一个指南站点](/guides/build-a-guides-site)、一份
  [API 参考](/guides/build-an-api-reference)、
  [将两者结合](/guides/combine-guides-and-api)，以及
  [构建你的侧边栏结构](/guides/structure-your-sidebar)。
- **创作** — [callout](/authoring/callouts)、[step](/authoring/steps)、
  [tab](/authoring/tabs)、[embed](/authoring/embeds)，以及
  [自定义标签](/authoring/custom-tags)，你可以在正文和文档注释中使用它们。
- **[包](/#the-packages)** — 这些构建模块，适合想要理解
  或扩展内部实现的你。

准备好开始设置了吗？前往 **[JSDoc Getting Started](/theme/jsdoc-getting-started)** 或
**[TypeDoc Getting Started](/theme/typedoc-getting-started)**。
