---
title: 使用图片
group: Guides
order: 6
---

# 使用图片

在文档的任何位置 reference 一张本地图片——一个 docs page、一个 tutorial、你的
README，或一段 JSDoc / TypeScript doc comment——主题就会把该文件 copy 进构建好的
站点，并替你 rewrite 链接。无需手动把文件 copy 到 output，也无需 absolute URL。

下面这张 diagram 是本站 `assets/` 文件夹中的一个本地 SVG，使用 root-relative 路径
reference：

![The clean-jsdoc-theme build pipeline](/assets/build-pipeline.svg)

> [!TIP]
> 这个页面本身就是可运行的示例——它的 source 是
> [`docs-site/docs/guides/working-with-images.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/docs/guides/working-with-images.md)。

## 在哪些地方生效

本地图片解析适用于主题渲染的每一种 prose source：

- **Docs pages**（`opts.docs`）——构建本站这类站点的 Markdown/HTML 文件。
- **Tutorials**（`--tutorials`）——JSDoc 的 tutorial 树。
- **README**——成为你首页的项目 README。
- **API comments**——写在 JSDoc 或 TypeScript doc comment（class / function /
  method 的 description）里的图片。

每种情况下，你只需写一个普通的 Markdown 图片（或一个 raw `<img>` tag），其余的交给
主题处理——没有任何需要配置的东西。

## 路径如何解析

你写的 `src` 会相对它所在的文件来解析：

| 你写的 `src` | 相对什么解析 |
| --- | --- |
| 相对路径（`./img/x.svg`、`../img/x.svg`） | source 文件自身的目录 |
| root-relative 路径（`/assets/x.svg`） | 你的 project root |
| `http(s)://…` URL 或 `data:` URI | 保持原样（external） |

也就是说，docs page 相对它自己的文件夹解析，tutorial 相对 tutorials 目录解析，
README 相对 project root 解析，而 API comment 相对 **comment 所在的源文件**解析。

解析后的图片会以 **content-hashed** 的名字 copy 到 `_assets/<name>.<hash>.<ext>`
（跨构建保持稳定，内容变更时自动 cache-busting），并把引用 rewrite 为指向它。raw 的
HTML `<img src="…">` 与 Markdown 的 `![](…)` 处理方式完全一致。

## 在 JSDoc / TypeScript comment 中

API reference 图片并不是特例——直接在 doc comment 里写一个 Markdown 图片，它会相对
**comment 所在的源文件**解析，然后像其他图片一样 hash 进 `_assets/`：

```js
/**
 * Processes a data stream and emits the running total.
 *
 * ![Data flow](../img/data-flow.svg)
 *
 * @param {string[]} data - The items to process.
 * @returns {Promise<number>} The processed count.
 */
async function process(data) { /* … */ }
```

JSDoc 的 `plugins/markdown` 会在主题看到 comment 之前就把它 render 成 `<img>`，
TypeDoc 的 doc comment 也以同样的方式工作。

## JSDoc `staticFiles`

JSDoc 有一个用于分发静态资源文件夹的标准选项——
`templates.default.staticFiles.include`——其中文件会落到 output root，你用它们的
**裸名字**（`![diagram](classes-io.png)`）来引用，通常来自像 `resources/doc/img`
这样的目录：

```json5
// jsdoc.json
templates: { default: { staticFiles: { include: ["resources/doc/img"] } } }
```

主题会遵循这一约定：你在那里列出的每个目录都会成为一个 **fallback 搜索根**，因此
一个裸的（或 root-relative 的）图片引用会被解析，并流经上面描述的同一条
content-hashed `_assets/` pipeline——你无需把现有的 comment 或 tutorial 改写成相对
路径。这些目录中的任何**非图片**文件（一个 `.puml` source、一个 PDF……）仍会按
JSDoc 的行为 **verbatim** 复制到站点根目录；pipeline 已经从 `_assets/` 提供过的
图片，不会再被复制到根目录第二次。

> [!NOTE]
> `staticFiles` 是一个 JSDoc 选项。使用 TypeDoc 时，把图片放在 source 旁边或你的
> `docs` 文件夹中，并用相对或 root-relative 路径引用它们——它们会流经同一条
> `_assets/` pipeline。

## SVG 会跟随主题

`.svg` 文件还多一步：它的 markup 会被直接 **inline** 进页面，而不是通过 `<img>`
加载。这样 SVG 自身的 `[data-theme="dark"]` 样式（或 `currentColor` 填充）就能跟随
页面内的 theme toggle——通过 `<img>` 加载的 SVG 只能看到操作系统的配色方案，永远看
不到你站点的 toggle。把这个页面在 light 与 dark 之间切换试试：上面的 diagram 会随之
重新着色。

## 代码示例是安全的

**作为示例**展示的图片 syntax——位于 inline `code span` 或 fenced block 中——会原样
保留；只有 prose 中的真实图片才会被复制和 rewrite。这就是为什么本页的每个
`![…](…)` 片段都按字面 render，而不会变成 `_assets/` 链接。

## 下一步

- [Configuration → How assets are handled](/theme/configuration#how-assets-are-handled)
  ——底层的 asset pipeline，与 logos 和 custom CSS/JS 共用。
- [Build a guides site](/guides/build-a-guides-site)——构建本站所用的 prose-first
  工作流。
