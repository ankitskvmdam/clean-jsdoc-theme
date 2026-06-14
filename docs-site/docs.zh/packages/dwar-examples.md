---
title: 示例
group: Packages/dwar
order: 41
---

# dwar 示例

dwar 是**内部**包。在普通的文档构建中你不会调用 `render` —— JSDoc
和 TypeDoc 桥接器会替你调用它。只有在构建*自定义桥接器*，或者想要单独查看
渲染器时，你才会直接使用它。

最佳的起点是该包自带的可运行示例：**smoke
脚本**。它针对一个固定数据（fixture）执行了完整的 `setu → dwar → disk` 路径，而且
因为它是真实运行的代码，所以它是本文档中最诚实的示例。

如果你只是想配置主题，请改为参阅 [配置](/theme/configuration)。

## 运行 smoke 脚本

```bash
pnpm --filter @clean-jsdoc-theme/dwar run smoke
```

[`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
会拉取 setu 的 JSDoc taffy 固定数据，将其传入 `generateSite()` 得到一个
`SiteManifest`，把该 manifest 交给 dwar 的 `render()`，将返回的文件**写入**
`packages/dwar/preview/`，并且 —— 如果安装了 `pagefind` —— 针对该目录构建
搜索索引。它的存在是为了便于做视觉上的健全性检查。

整个端到端流程是：**manifest 进入 → 文件输出 → 你写入它们 → preview/**。

## `render(manifest, opts)` 调用

`render` 接收 `SiteManifest` 和一个 `RenderOptions`。`RenderOptions` 唯一必填的
字段是 `theme`；其余都是可选的。smoke 脚本使用的是最简形式
（[`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)）：

```ts
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import type { ThemeConfig } from '@clean-jsdoc-theme/dwar';
import { generateSite } from '@clean-jsdoc-theme/setu';

const theme: ThemeConfig = {
  tokens: {
    colors: { bg: '#ffffff', bgMuted: '#f3f4f6', fg: '#0f172a', /* … */ border: '#e5e7eb' },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

const manifest = generateSite(collection, { pkg: { name: 'clean-jsdoc-theme', version: '…' } });

const result = await render(manifest, { theme });
//                              ^ only `theme` is required
```

### dwar 读取的 `RenderOptions` 字段

下面的每个字段都在
[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
中的 `RenderOptions` 上 —— 没有任何虚构。

| 字段 | 是否必填 | 作用 |
| --- | --- | --- |
| `theme` | **是** | `ThemeConfig` —— `tokens`（colors、fonts、shiki、`siteName` 等）、`basePath`，以及渲染读取的可选 `copyPage` / `pageNav` / `aiPrompt` / `customCss(File)` / `customJs(File)` 旋钮。 |
| `destination` | 否 | 目标目录。**仅**用于路径解析的上下文 —— dwar 自身从不向那里写入。 |
| `islandCacheDir` | 否 | 为 esbuild island 包提供的可选磁盘缓存。提供它可让热重建跳过约 0.4 秒的打包步骤；省略它则保持 `render()` 为纯函数。桥接器传入的是 `<project>/node_modules/.cache/clean-jsdoc-theme`。 |
| `inlineSvgs` | 否 | 从文档图片的 `src` 到该 SVG 原始标记的映射，使 rang 内联随主题变化的 SVG，而不是用 `<img>` 引用它们。桥接器读取这些文件；`render()` 只是查找它们。 |

桥接器会构建更完整的 `theme`（调色板覆盖、字体、`copyPage`、
`pageNav`、自定义 CSS/JS 的 hrefs）并传入全部四个选项，但契约
是一样的：`theme` 是必填的，其余则是桥接器恰好找到的内容。

## `RenderResult` 包含什么，以及桥接器如何持久化它

`render` 解析为一个 `RenderResult`
（[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)）：

```ts
interface RenderResult {
  files: OutputFile[];        // { path, contents } — everything to write
  search?: SearchEntry[];     // per-page entries (the JSON index is already in `files`)
  errors?: RenderError[];     // { slug, message } — pages skipped, present only on failure
  stats: {
    pageCount: number;        // pages rendered successfully (excludes errors)
    assetCount: number;       // non-HTML files (CSS + JS chunks + search index)
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}
```

实践中的纯函数契约：**`render()` 在内存中返回文件；由你来写入
它们。** smoke 脚本所做的正是这件事 —— 一个简单的写入循环，然后是可选的
Pagefind 步骤
（[`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)）：

```ts
const result = await render(manifest, { theme });

// Fresh output dir, then write every OutputFile (string or Uint8Array).
await rm(previewDir, { recursive: true, force: true });
await mkdir(previewDir, { recursive: true });
for (const file of result.files) {
  const out = resolve(previewDir, file.path);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents));
}

// Pagefind is a SEPARATE post-write step, against the written directory.
try {
  await runPagefindAgainstDir(previewDir);
} catch (err) {
  console.warn(`[smoke] pagefind skipped: ${(err as Error).message}`);
}
```

真正的桥接器遵循完全相同的形态。JSDoc 桥接器
（[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)）
调用 `render`，把 dwar 的文件与*它自己*复制的资源（logo、
自定义 CSS/JS、文档图片）拼接起来，将它们全部写入，然后运行 Pagefind：

```ts
const result = await render(manifest, {
  theme: { ...resolveTheme(opts, siteName, fonts, basePath), ...customAssets.theme },
  destination: absoluteDestination,
  islandCacheDir,
  inlineSvgs,
});

const outputFiles = [...result.files, ...logoFiles, ...customAssets.files, ...docImageFiles];
await writeOutputFiles(absoluteDestination, outputFiles);

// Render failures are reported, never fatal.
if (result.errors && result.errors.length > 0) {
  for (const e of result.errors) console.warn(`  - ${e.slug}: ${e.message}`);
}

// Pagefind is optional — a missing/failing index must not break the build.
try {
  await runPagefindAgainstDir(absoluteDestination);
} catch (err) {
  console.warn(`pagefind step skipped (optional) — ${(err as Error).message}`);
}
```

TypeDoc 桥接器
（[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)）
在 ESM 中做同样的事情：`render(manifest, { theme, destination, islandCacheDir })`，
然后是 `writeOutputFiles`，再然后是 `runPagefindAgainstDir`。两者都将 `errors`
数组视为警告，并将 Pagefind 步骤视为尽力而为。

> 注意写入循环中的分工：**dwar 的 `result.files`** 是
> HTML、配套的 `.md`、样式表、island 分块以及
> 模糊搜索 JSON。而 **logo、自定义 CSS/JS 和文档图片**由
> *桥接器*（I/O 层）复制并拼接进来 —— 这正是为什么 `render()` 保持
> 纯函数，只是链接所得到的 hrefs。

## 契约重申

- `render(manifest, opts)` 是**纯函数** —— 它在内存中分配文件并返回
  它们。它从不写入磁盘。
- **由你**将 `result.files` 写入目标位置。
- **`runPagefindAgainstDir(dir)`** 是一个*单独的*函数，你在写入*之后*
  针对目标目录调用它。它是整个包中唯一的文件系统接触点，
  而且是可选的。

## 阅读源码

这些是规范的、可运行的用法 —— 请阅读它们，而不是信任上面的任何
代码片段：

- **可运行示例：**
  [`packages/dwar/scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
  —— `generateSite` → `render` → 写入循环 → 可选的 Pagefind。
- **JSDoc 桥接器：**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  —— `render` 调用、合并写入、错误 + Pagefind 处理。
- **TypeDoc 桥接器：**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  —— 同样的路径，全程 ESM。
- **选项 + 结果类型：**
  [`packages/utils/src/site/render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
- **入口点：**
  [`packages/dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)

## 下一步

- [dwar 概览](/packages/dwar-overview) —— 为什么 dwar 存在、纯函数与
  弹性保证，以及 `render()` 发出什么。
- [setu 概览](/packages/setu-overview) —— `SiteManifest` 来自哪里。
- [rang 概览](/packages/rang-overview) —— dwar 打包进页面的组件与 islands。
