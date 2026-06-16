---
title: Embeds
group: Components
order: 3
---

# 嵌入内容与实时演示

> [!NOTE]
> **适用场景 —— prose 与 API docs。** 在 prose 中使用
> ` ```iframe ` fence 来撰写嵌入内容，或者在 source comment 中使用 `@iframe` block tag。
> 两者共享同一套 config 语法。

一个 **embed** 就是一个沙箱化的 `<iframe>` —— 可以是 CodePen、StackBlitz、实时演示，
或视频。主题为你提供了两种撰写方式，它们共享 **同一套 config
语法**：

- 在 **prose** 中（README、tutorials、docs 目录）—— 一个 ` ```iframe ` fenced
  code block；
- 在 **source comments** 中 —— `@iframe <url> key=value` doc-comment block tag。

两者都会经由
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
中的 `parseEmbedConfig` 进行 parse，并生成同一个 `<Embed>` island
（[`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)）。

## config 语法

config 是单独的一行（fence body 可以跨多行，但 token 以空白字符分隔）：

```
<url> key=value key="value with spaces" flag
```

- **第一个** 以空白字符分隔的 token 即为 **URL**（必填）。
- 其后的每一个 token 都是一个 `key=value` 键值对。
- 值可以用单引号或双引号包裹，被引号包裹的值可以包含空格。
- 不带 `=` 的裸 token 会被视为 `true` flag，但 **仅** 对布尔类型的
  key 有效；任何其他裸 token 都会发出警告并被忽略。

### URL schemes

出于安全考虑，`parseEmbedConfig` **仅** 接受 `https://` URLs 或
**protocol-relative** 的 `//` URLs。其他任何形式 —— `http://`、相对路径、
空字符串，或缺失的 URL —— 都会使 parser 返回 `null`，进而 embed
被 **丢弃**（parser 会记录一条警告）。请参阅
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
中的 `src.startsWith('https://') || src.startsWith('//')` 检查。

### Options

| Key           | Type    | Notes |
| ------------- | ------- | ----- |
| `title`       | string  | iframe title（无障碍）+ click-to-load 封面标签。 |
| `width`       | string  | CSS width。默认 `100%`。 |
| `height`      | number  | 像素值。无 `aspectRatio` 时默认为 `400`。非数值会被丢弃。 |
| `aspectRatio` | string  | 例如 `16/9`。设置后优先于 `height`。 |
| `allow`       | string  | iframe `allow=` 列表，例如 `"fullscreen; clipboard-write"`。 |
| `sandbox`     | string  | 覆盖默认的 sandbox token 列表。 |
| `clickToLoad` | boolean | 渲染一个 click-to-load 封面，而非实时 iframe。 |
| `themed`      | boolean | 同步到当前激活的主题。**默认开启**（见下文）。 |

未知的 key 会发出警告并被忽略；embed 仍会渲染。
默认 sandbox 为 `allow-scripts allow-same-origin allow-popups allow-forms`。

### 主题同步 —— `themed` 与 `{theme}` token

`themed` **默认开启**；若要退出，请传入 `themed=false`。开启时，embed
会在页面主题切换时重新指向自身，按优先级顺序选取一种
机制（[`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)
中的 `resolveSrc`）：

1. URL 中字面的 **`{theme}` token** 会被替换为 `light` / `dark`；
2. 作者声明的 `theme-id` query param 会被原样保留（它会胜出）；
3. 否则会自动追加 `?theme-id=<theme>`。

因此 `https://example.com/demo?ui={theme}` 在 dark mode 下会变成 `…?ui=dark`。
只有字面的 `themed=false`（不区分大小写）才会禁用此行为 —— 任何其他形式，
包括省略它，都会使其保持开启。

## 撰写形式 1 —— ` ```iframe ` prose fence

在任意 README / tutorial / docs page 中，编写一个 info string 为
`iframe` 的 fenced block。其 body 即为 config：

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

该 fence 由
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
中的 `resolveEmbedFences` 降级（lower）为 `<Embed>`。有效的 config 会变成
embed；无效的 config（例如非 `https` 的 URL）会被丢弃。
其他所有 fence（`js`、`ts`、`sh`、…）都不受影响。

下面是一个真实的、themed 的 embed，由一个 fence 渲染而来：

```iframe
https://ankdev.me/clean-jsdoc-theme/api-docs/ title="clean-jsdoc-theme API example" height=420
```

## 撰写形式 2 —— `@iframe` doc-comment tag

在 source comments 中，使用 `@iframe` block tag。语法相同 —— 第一个 token
为 URL，其后为 `key=value`：

```js
/**
 * A live demo of the renderer.
 *
 * @iframe https://example.com/embed/demo title="Renderer demo" aspectRatio=16/9
 */
export function render() {}
```

`@iframe` 由
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
中的 `embedBlocks` 处理。每一个有效的 `@iframe` 都会变成一个 `<Embed>`；
该 block 会在符号的 `@example` section **之后** 渲染。你可以在一个
doclet 上放置多个 `@iframe`。

> [!IMPORTANT]
> `@iframe` 并不是 base JSDoc 已知的 tag，因此你的 config 必须在
> `jsdoc.json` 中设置 `tags.allowUnknownTags: true`（本站点的
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> 就是这样做的）。否则，JSDoc 会在主题看到该 tag 之前就将其丢弃。

## 幕后原理

`parseEmbedConfig` 会生成一个 `EmbedSpec`；
[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
中的 `embed` builder 会发出一个自闭合的 `<Embed src="…" …/>` MDX JSX
node（numbers/booleans 会被字符串化，`undefined` 字段会被省略，以便
component 应用其默认值）。rang 在
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
中注册 `Embed`；component 会渲染一个 `data-island="embed"` 标记，
由 dwar 的 loader 进行 hydrate。实时 iframe 与 click-to-load 封面
两者都能在 **无 JavaScript** 的情况下工作（其中包含一个 `<noscript>`
回退 iframe）。

## 另请参阅

- [Custom tags](/components/overview) —— `@iframe` 与 `@category` /
  `@order` 一起使用，以及 `allowUnknownTags` 的要求。
- [Callouts](/components/callouts)、[Steps](/components/steps)、
  [Tabs](/components/tabs) —— 其他撰写原语（authoring primitives）。
