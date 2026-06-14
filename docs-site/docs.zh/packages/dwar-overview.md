---
title: 概览
group: Packages/dwar
order: 40
---

# `@clean-jsdoc-theme/dwar`

`@clean-jsdoc-theme/dwar` 负责主题管道的后半部分：它是
**纯渲染器**。把一个 `SiteManifest` 交给它，它就会把每个页面 server-render 为
HTML、打包交互式 island、生成 stylesheet 和 search index，
并将这一切作为内存中的 files 返回。它是
[setu](/packages/setu-overview) 的渲染端对应部分，setu 负责生成 manifest。

> [!NOTE]
> **名字的由来？** *dwar*（द्वार）在梵语/印地语中意为 **门 / 门户** —— 即
> `SiteManifest` 通过它最终变成成品 HTML site 的那扇门户。

唯一的 entry point 是
[`render(manifest, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)：

```ts
function render(manifest: SiteManifest, opts: RenderOptions): Promise<RenderResult>;
```

> 如果你只是想使用该主题，那么你永远不会直接安装这个 package ——
> JSDoc 和 TypeDoc bridge 会替你调用它。它是一个 internal
> building block。关于你实际会安装什么，请参阅 [Packages](/#the-packages) 部分；
> 关于真实的 call shape，请参阅 [dwar Examples](/packages/dwar-examples)。

## dwar 为何存在

一次 documentation build 有两项确实不同的工作：**理解 symbol**
和 **渲染像素**。setu 做第一项；dwar 做第二项。
这种拆分让 renderer 成为唯一了解 Preact、MDX、
Shiki、esbuild 和 HTML shell 的地方 —— 同时无需知道 doclet 是如何
被遍历的、或 sidebar 是如何成形的。dwar **只**消费 `SiteManifest`；
它从不重新读取 doclet 数据库。

`render`
（[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
就是引擎）按以下顺序执行：

- **构建 stylesheet** —— 由 `theme.tokens` 派生的 theme 变量，加上一个
  预编译的 Tailwind 工具类层，并以 `manifest.buildId` 加盖用于
  cache-busting
  （[`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts)，
  `buildThemeVariableCss` + 内联的 `UTILITY_CSS`）。
- **预先在**一次** split esbuild build** 中打包 island —— 每个 island
  都是一个 entry point，而 `splitting: true` 会将共享 code（Preact、rang 的
  registry）提升到一个独立的 `chunk-<hash>.js` 中，每个 entry 通过
  relative ESM 导入它。每个生成的 file 都经过 content-hash 处理（`[name]-[hash].js`）
  （[`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)）。
- **渲染每个页面** —— 将其 MDX body 编译为一个 Preact component，把
  它组合进 rang 的 layout，并将其序列化为一个 HTML document
  （[`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts)，
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)，
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)）。
  页面以受限并发渲染（一个上限为
  `min(8, cpus-1)` 的 worker pool），但会按原始页面顺序重新汇集，因此输出是
  确定性的。
- **生成 fuzzy-search index** —— 一个 JSON file（每个页面一个 entry，外加
  member/method deep-link），由 `cmdk` command-palette island 在
  runtime 时 fetch。它与 Pagefind 的全文 bundle 是分开的。

### Source 页面跳过 MDX

frontmatter 为 `kind: 'source'` 的页面是一个整文件查看器，而非散文。
dwar 会为它完全跳过 MDX 编译，转而挂载一个 `code-viewer` island：
SSR `<pre>` 携带文件文本，而 JSON props payload
则有意省略 code（hydration chunk 会从 DOM 中将其读回）。
Source 页面是 `hidden` 的，因此它们对 search index 没有任何贡献
（[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)，
`renderPage` 的 source 分支）。

## 这些保证（已在 source 中验证）

这是定义 dwar 的两条属性，二者都在代码中成立。

### `render()` 是纯的

dwar **不会**写入 disk。`render` 在内存中分配一个 `OutputFile` 数组
并返回它们；由 caller 持久化它们。render path 中没有任何
`fs` write、没有 `process.cwd()`、没有 logging。module docstring 直截了当地
说明了这一点：*"`render()` is pure: it returns an in-memory `RenderResult`."*

两个经过仔细限定的例外印证了这条规则，且两者都不会破坏 default path
的纯粹性：

- **`runPagefindAgainstDir`** 是该 package 中**唯一**的 filesystem touch，
  并且它是一个*独立的、写入之后的* function —— 从不被 `render` 调用。它
  作用于一个已写入的 HTML 目录，并将 Pagefind bundle 生成到
  `<dir>/pagefind/` 之下
  （[`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)）。
- **`opts.islandCacheDir`** 是 opt-in 的。当（且仅当）某个 bridge 提供它时，
  esbuild island bundle 会从一个 on-disk cache 中读取/写入；省略它 ——
  即 default —— 则 bundling 始终保持在内存中。读取 `os.cpus()` 以确定 worker
  pool 的大小被明确指出*不会*破坏该契约（契约关乎的是没有
  fs/cwd/logging）
  （[`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)，
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts) options）。

### `render()` 是有弹性的

单个编译失败的页面（例如无法解析的 MDX）**不会**中止
build。每个页面都在一个 `try/catch` 内部渲染：失败时该页面会被跳过并
作为 `result.errors` 中的一个 `{ slug, message }` entry 被
捕获，site 的其余部分仍会渲染。错误会被*报告*，而绝不会被*抛出* —— bridge
会在 build report 之后将跳过的页面作为 warning 记录
（[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)，
`task` 闭包；
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
将它们呈现出来）。

## `render()` 生成什么

一切都在 `result.files` 中返回（一个 `OutputFile[]`，每一项为
`{ path, contents }`，带有一个相对于目标根的 forward-slash path）：

- **逐页 HTML** —— `<slug>/index.html`（root/空 slug → `index.html`），
  来自
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  的完整 document shell。
- **一个同位的伴随 `.md`**，对应每个 content 页面 —— 页面的 MDX body
  被**逐字**写出（`<slug>/index.md`），以便 LLM 和复制页面按钮能够
  fetch 当前页面的 Markdown source。Source-viewer 页面没有 body，
  因此不会生成任何此文件。
- **一个 stylesheet** —— theme 变量 + 工具类 CSS，加盖了 build-id。
- **fuzzy-search index** —— `_assets/search-index.<buildId>.json`，包含页面
  entry 外加 member deep-link。
- **island bundle** —— 经 content-hash 处理的 entry chunk 外加共享 chunk，
  位于 `_islands/` 之下。
- **一个逐页的 JSON props payload** —— 作为
  `<script type="application/json" data-island-props>` 嵌入每个 HTML document，
  由内联的 island loader 在 hydration 时读取
  （[`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)，
  `buildIslandsPropsPayload`）。

除 `files` 之外，`RenderResult` 还携带 `search`（逐页 entry，供任何
想要它们的 caller 使用）、一个可选的 `errors` 数组（仅当某个页面
失败时才存在），以及一个 `stats` 块（`pageCount`、`assetCount`、
`cssBytes`、`jsBytes`、`durationMs`）
（[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)）。

> 这里有意地**没有 `embedSearchIndex` flag**。全文搜索是独立的
> `runPagefindAgainstDir` 写入之后步骤 —— renderer 从不内联任何 Pagefind
> bundle。

## Dependencies

dwar 依赖它位于其下游的三个 sibling package，外加 render
toolchain
（[`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/package.json)）：

- **`@clean-jsdoc-theme/utils`** —— 边界类型（`SiteManifest`、
  `RenderOptions`、`RenderResult`、`OutputFile`……）；参见
  [utils Overview](/packages/utils-overview)。
- **`@clean-jsdoc-theme/setu`** —— manifest 生成器（由 smoke
  script 使用）；参见 [setu Overview](/packages/setu-overview)。
- **`@clean-jsdoc-theme/rang`** —— dwar 打包并组合的那些 Preact component 与
  island registry；参见 [rang Overview](/packages/rang-overview)。
- **`preact` / `preact-render-to-string`** 用于 SSR，**`@mdx-js/mdx`** +
  **`@shikijs/rehype`** / **`shiki`** 用于 MDX 编译 + 高亮，
  **`esbuild`** 用于 island bundle，以及 **`pagefind`**（可选）用于
  写入之后的 index。

## 阅读 source

维护者希望把你引向代码 —— 从这里开始：

- **Package directory：**
  [packages/dwar](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar)
  ·
  [packages/dwar/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar/src)
- **entry point + 纯粹性/弹性逻辑：**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)
  （`render`、逐页的 `try/catch`、source-page 分支）
- **option + result 类型：**
  [`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
  （`RenderOptions`、`RenderResult`、`OutputFile`、`RenderError`）
- **HTML shell：**
  [`html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/html.ts)
  （`renderHtmlDocument`、`htmlPathFor`、`mdPathFor`、props payload）
- **layout 接缝：**
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  （`SsrLayout`，组合 rang 的 slot + island marker）
- **MDX 编译：**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/mdx.ts)
  （`compileMdxToComponent`、`collectUsedLangs`）
- **island bundle：**
  [`islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  （split esbuild build）以及
  [`islands-loader.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-loader.ts)
- **CSS 管道：**
  [`css.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/css.ts)
- **（唯一的）filesystem touch：**
  [`pagefind.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/pagefind.ts)
  （`runPagefindAgainstDir`）
- **可运行的 example：**
  [`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)

## 下一步

- [dwar Examples](/packages/dwar-examples) —— 可运行的 smoke script 以及来自
  那两个 bridge 的真实 call shape。
- [setu Overview](/packages/setu-overview) —— dwar 所消费的 `SiteManifest`
  的来源。
- [rang Overview](/packages/rang-overview) —— dwar 打包的那些 component 与
  island。
- [Configuration](/theme/configuration) —— 驱动一次 render 的 `theme` 选项。
