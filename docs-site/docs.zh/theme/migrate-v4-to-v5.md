---
title: 从 v4 迁移到 v5
group: Using the Theme
order: 6
---

# 从 v4 迁移到 v5

v5 是从零开始的重写：它对每个页面进行服务端渲染，为每个页面输出一个配套的 `.md`
文件，内置搜索和源码查看器，并新增了 `opts.docs` 散文（prose）管线。配置面发生了
很大变化——但迁移过程是机械式的，本页（以及下面的迁移 skill）会带你一步步完成。

> [!TIP]
> **你可以把这整项工作交给你的 AI 助手。** 这里有一个专门的
> [**迁移 skill**](#let-an-agent-do-it)——把你的 agent 指向它，它就会提取你的
> 选项，重命名可继续保留的部分，删除已废弃的部分，并验证构建。参见底部的
> Let an agent do it。

## 唯一需要知道的事

v4 将主题选项嵌套在 **`opts.theme_opts.*`** 之下。v5 则**直接从 `opts.*`**
读取它们——v5 中没有 `theme_opts` 块。所以迁移本质上就是：把你的选项从
`theme_opts` 中提升出来，重命名少数可继续保留的选项，删除其余的，然后可选地
采用 v5 的新功能。

```json5
// v4 — nested under opts.theme_opts
{ opts: { template: "node_modules/clean-jsdoc-theme",
          theme_opts: { default_theme: "dark", title: "My Library" } } }

// v5 — directly under opts (no theme_opts)
{ opts: { template: "node_modules/clean-jsdoc-theme",
          siteName: "My Library" } }
```

## 步骤

<steps>

<step label="Check compatibility">

v5 需要 **JSDoc ≥ 4** 和 **Node ≥ 20**。主题不再需要 `plugins/markdown` 插件
（v5 自己渲染 Markdown），不过保留它也无妨。暂时想留在 v4？请固定
`"clean-jsdoc-theme": "^4"`——v5 预发布版本在 npm `next` 标签下发布，因此 `^4`
不会拉取到它们。

</step>

<step label="Upgrade the package">

```sh
npm i -D clean-jsdoc-theme@latest   # or @next during the v5 prerelease
```

</step>

<step label="Lift and rename options">

将每个键从 `theme_opts` 中提升到 `opts`，应用[映射表](#option-mapping)，然后
删除空的 `theme_opts` 块。可继续保留的选项（其余的都将被移除）：

- `base_url` → [`basePath`](/theme/configuration#basepath)
- `title` → [`siteName`](/theme/configuration#sitename)
- `sections` → [`sectionOrder`](/theme/configuration#sectionorder)
- `create_style` → `customCss`, `include_css` / `add_style_path` →
  [`customCssFile`](/theme/configuration#customcssfile-and-customjsfile)
- `add_scripts` → `customJs`, `include_js` / `add_script_path` → `customJsFile`
- `menu` → [`menu`](/theme/configuration#menu)（已重塑——见下文）

</step>

<step label="Build and verify">

```sh
npx jsdoc -c jsdoc.json
npx serve <destination>   # Pagefind full-text search needs HTTP
```

对于任何遗留的 `theme_opts` 键或 v4 选项名，v5 会**发出警告**（并附带
“did you mean?” 提示）并继续构建——请阅读输出并修正它标记的内容。在迁移期间，
可设置 [`strict: true`](/theme/configuration#strict) 将这些警告变为硬错误，
之后再放宽。

</step>

</steps>

## Option mapping

`opts.theme_opts.<v4>` → `opts.<v5>`。

| v4 (`theme_opts.*`) | v5 (`opts.*`) | 状态 | 说明 |
| --- | --- | --- | --- |
| `default_theme` | — | 已移除 | 明/暗 token 集 + 运行时切换；没有选择器。 |
| `base_url` | `basePath` | 已重命名 | 站点根路径，作为前缀加到链接上。 |
| `title` | `siteName` | 已变更 | 字符串**或**一个 logo 集 `{ default, dark, light, alt }`。 |
| `menu` | `menu` | 已变更 | 已重塑：`{ id?, title?, link/href?, icon? }`；`target`/`class` 已移除。 |
| `sections` | `sectionOrder` | 已重命名 | 筛选并排序侧边栏区块。 |
| `create_style` | `customCss` | 已重命名 | 内联 CSS（在主题样式表之后加载）。 |
| `include_css` / `add_style_path` | `customCssFile` | 已重命名/已变更 | CSS 文件 → 带内容哈希的资源链接。 |
| `add_scripts` | `customJs` | 已重命名 | 内联 JS（最后运行）。 |
| `include_js` / `add_script_path` | `customJsFile` | 已重命名/已变更 | JS 文件 → 带内容哈希的资源。 |
| `favicon` | — | 已移除 | 使用 JSDoc 自身的静态文件复制。 |
| `homepageTitle` | — | 已移除 | 首页 `<title>` 由 README / `docs/index.md` + `siteName` 派生。 |
| `includeFilesListInHomepage` | — | 已移除 | Source Files 区块会列出文件。 |
| `meta` | — | 已移除 | 没有自定义 `<meta>` 注入。 |
| `search` | — | 已移除 | 始终开启的模糊搜索 + 可选的 Pagefind。 |
| `codepen` | — | 已移除 | 使用 [`@iframe`](/guides/embeds) 嵌入。 |
| `static_dir` | — | 已移除 | 使用 JSDoc 自身的静态文件配置。 |
| `footer` | — | 已移除 | 由 `siteName` / `pkg` 派生。 |
| `exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle` | — | 已移除 | 没有等价项。 |

> [!NOTE]
> **menu** 已重塑：v4 条目 `{ title, link, target, class, id }` 变为
> v5 的 `{ id?, title?, link (or href)?, icon? }`——去掉 `target`/`class`，加上一个
> `icon`（`lucide:<name>` / `simpleicons:<name>`）。在 v5 中，`id` 还可选择内置项
> （`{ id: "home" }`、`{ id: "source" }`），并且 `menu` 优先于
> `sectionOrder`。参见 [`menu`](/theme/configuration#menu) 和
> [Structure your sidebar](/guides/structure-your-sidebar)。

## 迁移前 / 迁移后

<tabs group="version">

<tab label="v4 (theme_opts)">

```json5
{
  plugins: ["plugins/markdown"],
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    theme_opts: {
      default_theme: "dark",
      base_url: "https://example.com/docs/",
      title: "My Library",
      menu: [{ title: "GitHub", link: "https://github.com/me/lib", target: "_blank" }],
      sections: ["Classes", "Modules", "Global"],
      search: true,
      footer: "© My Library",
      include_css: ["./static/custom.css"],
    },
  },
}
```

</tab>

<tab label="v5 (opts)">

```json5
{
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    basePath: "https://example.com/docs/",
    siteName: "My Library",
    menu: [
      { id: "home", title: "Home" },
      { title: "GitHub", link: "https://github.com/me/lib", icon: "simpleicons:github" },
    ],
    sectionOrder: ["Classes", "Modules", "Global"],
    customCssFile: "./static/custom.css",
    // dropped: default_theme (auto), search (always on), footer (derived)
    docs: "./docs", // optional v5 upside
  },
}
```

</tab>

</tabs>

## 你在 v5 中能解锁什么

迁移同时也是一次升级。一旦你用上 v5，就可以使用：

- [**与你的 API 并列的散文指南**](/guides/combine-guides-and-api) — `docs` +
  `docGroups`，与本站点使用的是同一套管线。
- [**创作基本元素**](/components/callouts) — 在注释和散文中使用 callouts、
  steps、tabs 和实时嵌入。
- [**侧边栏结构**](/guides/structure-your-sidebar) — `@category` / `@order`
  标签、`clubSidebarItems`、`menu`。
- [**LLM 功能**](/theme/llm-skill) — 每个页面一个配套的 `.md`、复制页面
  按钮，以及 `aiPrompt`。

## Let an agent do it

不想手动完成？**把你的 AI 助手指向迁移 skill。**
这是一套聚焦、源码验证过的流程，它会检测你的 v4 配置、应用上面的映射、
重塑菜单、移除已废弃的内容，并验证构建——然后把总括（umbrella）skill 交给你，
以便助手帮你采用新的 v5 功能。

- **迁移 skill：**
  [`SKILLS/migrate-v4-to-v5/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/migrate-v4-to-v5/SKILL.md)
  — 按照与[总括 skill](/theme/llm-skill) 相同的方式下载它：

  ```sh
  curl -O https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/migrate-v4-to-v5/SKILL.md
  ```

  然后把它附加到你的助手（或放进 `.claude/skills/`），并说
  *“migrate my project from clean-jsdoc-theme v4 to v5。”*

- **权威参考：** 详尽的
  [`MIGRATION.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/MIGRATION.md)
  和机器可读的
  [`migration-map.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/migration-map.json)
  是该 skill 的依据——对编写 codemod 很有用。

## 另请参阅

- [Use with an LLM](/theme/llm-skill) — 总括 skill 以及如何把它喂给
  你的助手。
- [Configuration](/theme/configuration) — 详细介绍每个 v5 选项。
- [JSDoc Getting Started](/theme/jsdoc-getting-started) — 从零开始的全新 v5 配置。
