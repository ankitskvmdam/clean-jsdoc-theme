---
title: 示例
group: Packages/setu
order: 21
---

# setu 示例

setu 是**内部使用的**。在普通的文档构建中，你不会自己调用 `generateSite`——
JSDoc 和 TypeDoc 桥接器会替你调用它。只有当你在构建*自定义桥接器*（一个生成 salty doclet
集合的新前端）时，才会直接使用它。所以这里诚实的示例，就是随主题一同发布的那两个真实桥接器。

如果你只是想配置主题，请改为参阅
[配置](/theme/configuration) 和 [指南](/guides/build-an-api-reference)。

## 调用形态

两个桥接器都会构建一个 salty doclet 集合、组装一个选项对象，并
调用 `generateSite`。下面的每个字段都存在于
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
中的 `GenerateSiteOptions` 上——没有任何虚构的内容。

这是 TypeDoc 桥接器，它全程使用 ESM 并直接导入 setu（来自
[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)）：

```ts
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';

// reflections → flat doclets → a salty collection (the shape setu consumes).
const doclets = reflectionsToDoclets(project, logger);
const collection = salty.taffy(doclets);

const manifest = generateSite(collection, {
  ...(pkg ? { pkg } : {}),                         // package.json fields
  ...(readme ? { readme } : {}),                   // README HTML → home page
  ...(sources.length > 0 ? { sources } : {}),      // SourceFileInput[] → viewer pages
  ...(sectionOrder ? { sectionOrder } : {}),        // sidebar section order
  ...(menu ? { menu } : {}),                        // full sidebar menu
  ...(clubSidebarItems ? { clubSidebarItems } : {}),// prefix-group sidebar entries
});
```

JSDoc 桥接器做的事情相同，外加那些只在 JSDoc 运行时才有意义的选项——
教程、文档目录、doc-group 排序，以及源码链接目标（来自
[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)）：

```ts
const manifest = generateSite(data, {
  ...(pkg ? { pkg } : {}),
  ...(readme ? { readme } : {}),
  ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
  ...(sources.length > 0 ? { sources } : {}),
  ...(sources.length > 0 && sourceLinkToComment ? { sourceLinkToComment } : {}),
  ...(docs.length > 0 ? { docs } : {}),
  ...(docGroups ? { docGroups } : {}),
  ...(defaultDocGroup ? { defaultDocGroup } : {}),
  ...(sectionOrder ? { sectionOrder } : {}),
  ...(menu ? { menu } : {}),
  ...(clubSidebarItems ? { clubSidebarItems } : {}),
});
```

注意这个模式：每个选项都是有条件地展开的，因此缺失的功能
根本不会被传入。**唯一的必需参数是集合**——传给 `generateSite` 的
两个参数中，其余的都由桥接器所发现的内容驱动。

### 完整的选项面

`GenerateSiteOptions`
（[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)）上的每个字段：

| 选项 | 它的作用 |
| --- | --- |
| `pkg` | 嵌入 manifest 的 package.json 字段（页眉/页脚/OG 标签）。 |
| `readme` | 项目 README **作为 HTML** → 站点首页（slug 为 `''`）。 |
| `tutorials` | 一个 `TutorialInput[]` 树 → “Tutorials”下的指南页面。 |
| `docs` | 一个 `DocInput[]` 列表（由桥接器预先读取）→ 文章/指南页面。根级的 `index` 会成为首页。 |
| `docGroups` | 顶层 doc-group 的显示顺序。 |
| `defaultDocGroup` | 没有分组的文档页面所用的分组标签。 |
| `sources` | 一个 `SourceFileInput[]` → 只读的源码查看页面 + `Source:` 链接。 |
| `sourceLinkToComment` | `true` → `Source:` 链接指向文档注释所在行，而非声明所在行（默认 `false`）。 |
| `sectionOrder` | 一个统一列表，对 `@category` 名称、doc group 和 kind 标签进行排序。 |
| `menu` | 完整的侧边栏菜单（优先级高于 `sectionOrder`）。 |
| `clubSidebarItems` | 将相关条目归并为一层的前缀子树。 |

## 返回什么，以及它流向何处

`generateSite` 返回一个
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)
——`pages`、`nav`、一个可选的 `pkg`，以及一个内容稳定的 `buildId`：

```ts
const manifest = generateSite(collection, opts);
// manifest.pages   — Page[]  (one per symbol + globals + prose + source pages)
// manifest.nav     — NavNode[] (the sidebar tree)
// manifest.buildId — string  (timestamp + content hash, for cache busting)
```

> manifest **不携带搜索索引字段**。setu 的逐页正文才是稍后
> 提供给搜索的内容；manifest 本身只是 `{ pages, nav, pkg?, buildId }`。

下一步永远相同：把 manifest 直接交给
[`dwar.render()`](/packages/dwar-overview)，由它将其转换为 HTML。两个桥接器
正是这么做的：

```ts
import { render } from '@clean-jsdoc-theme/dwar';

const result = await render(manifest, { theme, destination });
await writeOutputFiles(destination, result.files);
```

setu 生产了模型；dwar 渲染它。二者从不互相导入——它们
只在 [utils](/packages/utils-overview) 中定义的 `SiteManifest` 类型处相遇。

## 编写的功能如何映射到 setu 行为

你在源码注释和文档文件中编写的内容，在这里会变成 manifest 结构。
有几处值得了解的关联：

- **`@category` 和 `@order`。** 一个 API 符号的 `@category Core/Parsing order=1`
  标签会成为它的侧边栏分组（`/`-路径会嵌套它：`Core` ▸ `Parsing`）及其
  组内排序键。独立的 `@order N` 可以为*任意*符号定位——即便是一个
  未加标签的 `@class`——使其位于所属 kind 区段内。解析逻辑见
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)。
  参阅 [组织你的侧边栏](/guides/structure-your-sidebar) 和
  [自定义标签](/authoring/custom-tags)。
- **README → 首页。** 你的 README（由 JSDoc/TypeDoc 渲染为 HTML）会成为
  slug 为 `''` 的首页，经由
  [`buildReadmePage`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)。
  你文档目录中根级的 `index.md` 会覆盖它。
- **文档文件夹 → 指南页面。** 你文档目录下的每个 Markdown/HTML 文件
  都会成为一个文章页面，使用其干净（无前缀）的 slug，并按其
  frontmatter `group` 或目录路径分组，经由
  [`buildDocPages`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)。
  frontmatter 的 `title` / `group` / `order` / `hidden` 都会被遵循。参阅
  [构建一个指南站点](/guides/build-a-guides-site)。
- **`{@link}` / `@see` / `@tutorial`。** 会针对在第 2 遍中构建的链接注册表
  进行解析——只有那些确实拥有页面或成员标题的目标才会被解析；
  其余的则回退为惰性文本，而不是一个失效的锚点
  （[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)）。

## 阅读源码

这些是规范的、可工作的用法——请阅读它们，而不要相信上面的任何
代码片段：

- **TypeDoc 桥接器：**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  ——用 `salty.taffy` 构建集合，调用 `generateSite`，把
  manifest 交给 `render`。
- **JSDoc 桥接器：**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  ——JSDoc 所调用的 `publish(data, opts, tutorials)` 入口；它收集 sources、
  docs 和 tutorials，然后调用 `generateSite`。
- **选项类型：**
  [`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)

## 下一步

- [setu 概览](/packages/setu-overview) —— setu 为何存在及其契约
  边界。
- [dwar 概览](/packages/dwar-overview) —— 是什么消费了 `SiteManifest`。
- [构建一个 API 参考](/guides/build-an-api-reference) —— 这些桥接器所驱动的
  端到端路径。
