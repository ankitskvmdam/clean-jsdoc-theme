---
title: 示例
group: Packages/utils
order: 11
---

# 使用 `@clean-jsdoc-theme/utils`

> **先对自己坦诚：** `@clean-jsdoc-theme/utils` 是一个内部
> 构建块。你几乎从不单独安装它。只有在编写**自定义 bridge**（你自己的入口点，
> 用于驱动 `setu → dwar`）、生成或检查 `SiteManifest` 的**工具**，或需要边界类型的
> **组件覆盖**时，你才会用到它。如果你只是想要文档，请改为安装一个
> [入口点](/#the-packages)并设置[选项](/theme/configuration)。

所有内容都从单一的包入口导出——不存在子路径导出
（`package.json` 仅暴露 `.`），所以所有导入都是这样的：

```ts
import { slugifyHeading, validateThemeOpts } from '@clean-jsdoc-theme/utils';
import type { SiteManifest, Page, ThemeConfig } from '@clean-jsdoc-theme/utils';
```

## 导入一个契约类型

当你构建某个会把 `SiteManifest` 交给 dwar（或消费它）的东西时，
请导入边界类型。这些正是 setu 发出、dwar 渲染的确切结构——参见
[`manifest.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
和
[`page.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/page.ts)。

```ts
import type { SiteManifest, Page, NavNode } from '@clean-jsdoc-theme/utils';

// A hand-built manifest — what setu would normally produce for you.
const manifest: SiteManifest = {
  pages: [
    {
      slug: 'guides/intro',
      frontmatter: { title: 'Intro', kind: 'guide', group: 'Guides', order: 1 },
      body: '# Intro\n\nWelcome.',
    } satisfies Page,
  ],
  nav: [
    { label: 'Guides', children: [{ label: 'Intro', slug: 'guides/intro' }] },
  ] satisfies NavNode[],
  buildId: '2026-06-12-abc123',
};
```

这些类型强制约束的几点，直接来自源码：

- `Page.slug` 相对于站点根目录——没有前导斜杠，没有 `.html`。
- `Page.body` 始终是一个 MDX 字符串；`mdast` 和 `headings` 是可选的。
- `Frontmatter.kind` 是一个 `PageKind`（`class` | `module` | `namespace` |
  `mixin` | `interface` | `typedef` | `global` | `index` | `guide` | `source`）。
- `NavNode` 是递归的：叶子节点携带 `slug`，分支节点携带 `children`。

主题契约位于
[`theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)：

```ts
import type { ThemeConfig } from '@clean-jsdoc-theme/utils';

const theme: ThemeConfig = {
  tokens: {
    colors: {
      bg: 'oklch(1 0 0)',
      bgMuted: 'oklch(0.97 0 0)',
      fg: 'oklch(0.2 0 0)',
      fgMuted: 'oklch(0.5 0 0)',
      accent: 'oklch(0.6 0.2 250)',
      accentFg: 'oklch(1 0 0)',
      border: 'oklch(0.9 0 0)',
    },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
  },
  basePath: '/docs/',
};
```

## 使用一条 slug 规则

setu 和 dwar 都通过相同的函数进行 slug 化，因此侧边栏链接与它指向的
标题锚点永远不会不一致。来自
[`slug-rules.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/slug-rules.ts)
的已验证行为：

```ts
import { slugifyHeading, slugifyPath, slugifySourcePath } from '@clean-jsdoc-theme/utils';

slugifyHeading('Hello, World!'); // 'hello-world'  (lowercased, punctuation dropped)
slugifyPath(['Foo Bar', 'Baz!']); // 'foo-bar/baz'
slugifySourcePath('src/Foo.js'); // 'src/foo-js'   (extension folded in, not stripped)
slugifySourcePath('lib\\util\\index.ts'); // 'lib/util/index-ts'  (backslashes normalized)
```

`slugifyHeading` 接受一个可选的注册表，用于对页面上重复的标题去重——
传入一个 `Map` 并在每个标题之间复用它：

```ts
const reg = new Map<string, number>();
slugifyHeading('Options', reg); // 'options'
slugifyHeading('Options', reg); // 'options-1'
slugifyHeading('Options', reg); // 'options-2'
```

要从子目录提供服务，请将基础路径规范化一次，并通过 `withBase` 拼接链接
（两者都是纯函数，并安全回退到 `'/'`——参见
[`base-path.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/base-path.ts)）：

```ts
import { normalizeBasePath, withBase } from '@clean-jsdoc-theme/utils';

const base = normalizeBasePath('https://example.com/docs/api/'); // '/docs/api'
withBase(base, '/guides/intro'); // '/docs/api/guides/intro'
withBase('/', '/guides/intro'); // '/guides/intro'  (unchanged at the root)
```

## 校验选项（并接入可注入的 fetch）

`validateThemeOpts` 是 bridge 在构建前运行的协调器。它从不
抛出异常：它返回规范化后的 `value` 以及一个由你决定如何处理的 `DiagnosticBag`。参见
[`validate-opts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/validate-opts.ts)。

Google-Fonts 存在性检查是*唯一*联网的部分，并且它是
**注入式的**——你用 `createGoogleFontResolver()` 构建一个解析器并把它传进去。
正是这一点保证了 utils 浏览器安全（它自己从不导入 `fetch`）。
省略该解析器，字体检查就会被优雅地跳过。

```ts
import {
  validateThemeOpts,
  createGoogleFontResolver,
  formatDiagnostics,
} from '@clean-jsdoc-theme/utils';

const fontResolver = createGoogleFontResolver(); // uses global fetch; fail-open + cached

const { value, diagnostics } = await validateThemeOpts({
  opts: { siteName: 'My API', fonts: { heading: 'Roboto', body: 'Roboto' } },
  fontResolver,
  unknownKeyPolicy: 'suggest-typos', // only flag near-miss typos of a known key
});

// value.siteName / value.fonts are normalized; decide your own policy on findings:
if (diagnostics.list.length > 0) console.log(formatDiagnostics(diagnostics, { color: true }));
if (diagnostics.hasErrors()) {
  // strict mode is the *caller's* choice — utils never throws
}
```

真实的 bridge 正是这样接入它的。位于
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
的 JSDoc bridge 构建解析器，以 `unknownKeyPolicy:
'suggest-typos'`（JSDoc 自身的选项共享这个扁平命名空间）调用 `validateThemeOpts`，然后记录这个 bag，
并且仅当设置了 `opts.strict` *且* `diagnostics.hasErrors()` 时才抛出异常。位于
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
的 TypeDoc 插件做法相同，但使用 `unknownKeyPolicy: 'warn-all'`，因为它的选项位于
一个专用的命名空间块中，而非共享的扁平命名空间。

对于测试或自定义运行时，你可以注入一个伪造的 `fetch`，而不必真正访问
网络——解析器只需要最小的 `FetchLike` 切片
（`url`、可选的 `signal`/`headers`，返回 `{ status }`）：

```ts
const resolver = createGoogleFontResolver({
  fetch: async (url) => ({ status: url.includes('Roboto') ? 200 : 400 }),
});
await resolver('Roboto'); // 'exists'
await resolver('Made Up Font'); // 'missing'  (200 → exists, 400 → missing, else → 'unknown')
```

## 打印一份构建报告

写入文件后，bridge 使用 `formatBuildReport` 格式化出一份 Next.js 风格的摘要。
与字体检查一样，仅限 node 的依赖（gzip）也是
**注入式的**，以使 utils 保持无 node 依赖——传入一个 `gzipSizer`，gzip 列就会
出现。参见
[`report.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/config/report.ts)。

```ts
import { formatBuildReport } from '@clean-jsdoc-theme/utils';
import { gzipSync } from 'node:zlib'; // the *caller* imports node, not utils

console.log(
  formatBuildReport({
    files: result.files, // OutputFile[] from dwar.render
    stats: result.stats,
    destination: './out',
    gzipSizer: (b) => gzipSync(b).length, // omit to hide the gzip column
    color: true,
  })
);
```

`publish.ts` 和 `write-site.ts` 都恰好以这种方式调用它——参见每个 bridge 中
`formatBuildReport({ … gzipSizer })` 调用附近的代码行。

## 更宏观的图景

- [utils 概览](/packages/utils-overview) — 每个导出的用途，以及这个包
  存在的原因。
- [Packages](/#the-packages) — utils 如何契合 `setu → dwar` 流水线。
- [setu 概览](/packages/setu-overview) — 生成你在此处看到其类型的 `SiteManifest`。
- [dwar 概览](/packages/dwar-overview) — 通过 `render()` 消费它。
