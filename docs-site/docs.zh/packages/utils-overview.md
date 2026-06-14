---
title: 概览
group: Packages/utils
order: 10
---

# `@clean-jsdoc-theme/utils`

`@clean-jsdoc-theme/utils` 是流水线中其他每个包都会导入的共享契约。它定义了
**setu 与 dwar 之间的 type 边界**、双方都使用的 **slug 规则**（使得导航链接与标题
anchor 始终保持一致），以及 entry-point bridge 运行的那套纯 **opts-validation +
build-report** 逻辑。

它不包含任何渲染、也不包含任何 I/O —— 只有那些 interface、Zod schema，以及整个
系统赖以构建的少数几个小型纯函数。

> 如果你只是想使用这个主题，那么你永远不需要安装这个包。它是一个内部构建模块。
> 关于你实际会安装的那些组成部分，请参阅 [Packages](/#the-packages) 一节；
> 关于各项选项，请参阅 [Configuration](/theme/configuration)。

## 为什么它是一个独立的包

整条流水线被刻意设计为单向的 —— setu 把 doclet 转换成 `SiteManifest`，dwar 渲染
该 manifest —— 而这两半之间绝不能滋生出任何隐藏的耦合。把边界 type 抽取到它们
自己的包中，给项目带来了两点好处：

- **边界拥有唯一的事实来源。** setu 发出一个 `SiteManifest`，dwar 消费*同一个*
  `SiteManifest` type，二者都不导入对方。这个形状在此处只定义一次，因此构建侧与
  渲染侧不会发生漂移。你可以在边界 barrel
  [`site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  中看到这一点，它自身的 doc comment 称其为 “the boundary contract between setu
  (build) and dwar (render)”。
- **浏览器安全，因此 rang 也可以导入它。** Preact 组件库（rang）运行在浏览器中，
  所以它所共享的契约必须是无 node 依赖的。这里的 slug 规则、base-path 辅助函数、
  diagnostics 模型以及 build-report formatter 只使用 web 平台的全局对象
  （`URL`、`TextEncoder`、`fetch`、`AbortController`）—— 绝不使用 `fs`、`Buffer`
  或 `node:*`。唯一的网络依赖（Google Fonts 是否存在）和唯一的仅 node 依赖
  （gzip 体积计算）是由调用方**注入**的，而非导入的，这正是让该包在浏览器中可被
  导入的原因。

顶层 barrel
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
re-export 了所有内容，而 `package.json` 只暴露了单一的 entry point —— 因此每个
消费方都从 `@clean-jsdoc-theme/utils` 导入（不存在 subpath export）。

## 内部有什么

这个包分为两个面：`site/` 契约与 `config/` 逻辑，再加上 JSDoc 的 doclet schema。

### `site/` —— setu ↔ dwar 契约

边界对象，以及双方必须共享的那些规则。已核实的 export 包括：

- **`SiteManifest`、`Page`、`NavNode`、`SearchEntry`** —— setu 交给 dwar 的内容：
  pages、nav 树、search 索引，以及用于缓存失效的 `buildId`。该 manifest 被刻意
  设计为自包含的：dwar 绝不应该再次读取 doclet 数据库。
  ([`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts),
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`Frontmatter`、`PageKind`、`Heading`** —— 每个 page 的 metadata、驱动布局的
  page kind（`class`、`module`、`guide`、`source`……），以及 TOC island 渲染所用
  的预先提取出来的 heading。
  ([`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts))
- **`RenderOptions`、`RenderResult`、`OutputFile`、`RenderError`** —— `dwar.render`
  的输入与输出。`render()` 是纯的，并在内存中返回文件；doc comment 指出其中刻意
  没有 `embedSearchIndex` 标志。
  ([`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts))
- **`ThemeConfig`、`ThemeTokens`、`ThemeColors`、`ComponentOverrides`** —— 主题
  契约：color token、fonts、Shiki 主题、组件 slot override、base path、copy-page
  与 prev/next 配置、自定义 CSS/JS。
  ([`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts))
- **`SiteName`、`SiteLogo`** 以及辅助函数 `siteNameText()` 和
  `resolveSiteLogo()` —— 纯文本或 logo 组合形式的站点标识。
  ([`site-name.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/site-name.ts))
- **`IslandName`、`IslandPropsMap`** —— 交互式 island 的注册表
  （`sidebar`、`toc`、`cmdk`、`copy-page`……）以及每个 island 的类型安全 prop bag，
  在服务端渲染与 hydration 之间共享。
  ([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts))
- **`slugifyHeading()`、`slugifyPath()`、`slugifySourcePath()`** —— GitHub 风格的
  slug 规则。setu（sidebar / TOC 生成）和 dwar（渲染出的 anchor ID）都从这里
  导入，从而让 anchor 与链接始终保持一致；该文件指出这是为了应对 “Risk R4”。
  ([`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts))
- **`normalizeBasePath()`、`withBase()`** —— 用于从子目录提供站点服务的纯净、
  浏览器安全、容错的辅助函数。
  ([`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts))

### `config/` —— 纯 opts 校验 + build report

entry-point bridge 在一次构建前后运行的逻辑：

- **`validateThemeOpts()`** —— 编排器。接收一个原始的 opts 对象，把 `siteName`
  和 `fonts` 校验器以及一项 unknown-key 策略合并到单个 `DiagnosticBag` 中运行，
  并返回规范化后的值。它从不抛出异常 —— strict-mode 的强制执行是调用方的职责，
  通过 `diagnostics.hasErrors()` 完成。
  ([`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts))
- **`DiagnosticBag`、`Diagnostic`、`formatDiagnostics()`** —— 报告体系的脊梁：
  一个结构化的、带级别标签（`error` / `warning` / `info`）的发现项模型，既纯净
  又无 node 依赖。
  ([`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts))
- **`createGoogleFontResolver()`、`FontResolver`、`FontExistence`、
  `FetchLike`** —— 让 utils 保持浏览器安全的那种*注入*模式。唯一的网络检查
  （这个 Google Font 是否存在？）是围绕一个注入进来的 `fetch` 构建的，并且是
  **fail-open** 的：任何模糊不清的情况都会 resolve 为 `'unknown'`，这样离线构建
  绝不会中断。
  ([`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts))
- **`formatBuildReport()`** —— Next.js 风格的构建摘要。字节大小来自
  `TextEncoder`（绝不来自 `Buffer`）；gzip 体积计算是一个*注入*进来的
  `gzipSizer`，同样是为了让 utils 保持无 node 依赖。
  ([`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts))
- **那些 Zod schema** —— `THEME_OPT_KEYS`、`SiteNameSchema`、`FontsSchema`、
  `MenuSchema`、`CopyPageConfigSchema` 及其同伴 —— 已识别的 theme-option 面，
  以 Zod 表达，从而让失败携带结构化的 `path` + `message`。
  ([`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts))

### doclet schema

`doclet-schema.ts`（`TDoclet` 及其同伴）和 `salty.ts`
（`TJSDocSaltyCollection`）承载着 setu 读取的那些 JSDoc 侧的 type。它们也从顶层
barrel 被 re-export，因此 setu 的 doclet 处理从同一个包导入它们。

## 注入模式是如何工作的

这正是让一个 config 包保持浏览器安全的细节所在。utils 从不导入 `fetch` 或
`zlib`；由调用方把它们传进来：

- `validateThemeOpts({ … fontResolver })` 接收一个 resolver，bridge 用
  `createGoogleFontResolver()` 构建它。没有它时，font 是否存在的检查会被优雅地
  跳过，构建照常进行。
- `formatBuildReport({ … gzipSizer })` 接收 gzip 函数。只有在提供了 sizer 时，
  gzip 列才会出现；bridge 传入 `(b) => zlib.gzipSync(b).length`。

`google-fonts.ts` 和 `report.ts` 都在各自的模块 doc comment 中说明了这一点：
那个网络 / 仅 node 依赖 “is never imported, only the optional
[resolver/sizer] injected by the caller.”

## 阅读源码

维护者希望把你引向代码 —— 从这里开始：

- **Package directory：**
  [packages/utils](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils)
  ·
  [packages/utils/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils/src)
- **Barrels：**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/index.ts)
  ·
  [`src/site/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/index.ts)
  （边界 barrel）·
  [`src/config/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/index.ts)
- **契约：**
  [`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
  ·
  [`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)
  ·
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  ·
  [`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
  ·
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/islands.ts)
  ·
  [`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
- **config 逻辑：**
  [`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)
  ·
  [`opts-schema.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/opts-schema.ts)
  ·
  [`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)
  ·
  [`google-fonts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/google-fonts.ts)
  ·
  [`diagnostics.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/diagnostics.ts)

## 下一步

- [utils Examples](/packages/utils-examples) —— 使用这些 type 的具体代码片段。
- [setu Overview](/packages/setu-overview) —— *产生* `SiteManifest` 的那个包。
- [dwar Overview](/packages/dwar-overview) —— *消费* 它的那个包。
