---
title: Embeds
group: Components
order: 3
---

# Embeds & live demos

> [!NOTE]
> **どこで使えるか — prose と API docs。** embed は prose では
> ` ```iframe ` fence で書き、source comment では `@iframe` block tag で書きます。
> どちらも同じ config grammar を共有します。

**embed** とは sandboxed な `<iframe>` です — CodePen、StackBlitz、live demo、
video など。Theme はこれを書く 2 つの方法を提供し、それらは **1 つの config
grammar** を共有します:

- **prose** の中で（README、tutorials、docs directory）— ` ```iframe ` fenced
  code block;
- **source comments** の中で — `@iframe <url> key=value` doc-comment block tag。

どちらも
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
の `parseEmbedConfig` を通って parse され、同じ `<Embed>` island になります
（[`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)）。

## config grammar

config は単一の行です（fence body は複数行にまたがってもよいですが、tokens は
whitespace で区切られます）:

```
<url> key=value key="value with spaces" flag
```

- **最初の** whitespace 区切りの token が **URL** です（必須）。
- それ以降のすべての token は `key=value` のペアです。
- 値は single または double quotes で包むことができ、quoted な値には spaces を
  含められます。
- `=` のない素の token は `true` flag として扱われますが、それは boolean keys に
  **対してのみ** です。それ以外の素の token は警告を出し、無視されます。

### URL schemes

セキュリティのため、`parseEmbedConfig` は `https://` URLs または
**protocol-relative** な `//` URLs **のみ** を受け入れます。それ以外のもの —
`http://`、relative path、空の string、あるいは URL の欠落 — は parser に `null`
を返させ、embed は **破棄されます**（parser は警告を log します）。
[`embed.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/embed.ts)
の `src.startsWith('https://') || src.startsWith('//')` のチェックを参照して
ください。

### Options

| Key           | Type    | Notes |
| ------------- | ------- | ----- |
| `title`       | string  | iframe title (accessibility) + click-to-load poster label. |
| `width`       | string  | CSS width. Default `100%`. |
| `height`      | number  | Pixels. Default `400` when no `aspectRatio`. A non-numeric value is dropped. |
| `aspectRatio` | string  | e.g. `16/9`. Preferred over `height` when set. |
| `allow`       | string  | iframe `allow=` list, e.g. `"fullscreen; clipboard-write"`. |
| `sandbox`     | string  | Override the default sandbox token list. |
| `clickToLoad` | boolean | Render a click-to-load poster instead of a live iframe. |
| `themed`      | boolean | Sync to the active theme. **On by default** (see below). |

未知の keys は警告を出して無視されますが、embed は引き続き render されます。
既定の sandbox は `allow-scripts allow-same-origin allow-popups allow-forms`
です。

### Theme syncing — `themed` と `{theme}` token

`themed` は **既定で on** です。opt out するには `themed=false` を渡します。on の
とき、embed は page の theme が切り替わるたびに自身を再指定し、優先順位に従って
1 つの mechanism を選びます
（[`Embed.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Embed.tsx)
の `resolveSrc`）:

1. URL 内の文字どおりの **`{theme}` token** は `light` / `dark` に置き換えられます;
2. author が宣言した `theme-id` query param はそのまま残されます（それが勝ちます）;
3. それ以外の場合は `?theme-id=<theme>` が自動的に付加されます。

したがって `https://example.com/demo?ui={theme}` は dark mode では `…?ui=dark` に
なります。これを無効化するのは文字どおりの `themed=false`（case-insensitive）
だけです — それ以外のもの、省略を含めて、すべて on のままにします。

## Authoring form 1 — ` ```iframe ` prose fence

任意の README / tutorial / docs page で、info string を `iframe` とした fenced
block を書きます。Body が config です:

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

fence は
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
の `resolveEmbedFences` によって `<Embed>` へと lower されます。有効な config は
embed になります。無効な config（例えば非 `https` URL）は破棄されます。その他の
すべての fences（`js`、`ts`、`sh`、…）はそのまま残されます。

これは fence から render された、実際の themed embed です:

```iframe
https://ankdev.me/clean-jsdoc-theme/api-docs/ title="clean-jsdoc-theme API example" height=420
```

## Authoring form 2 — `@iframe` doc-comment tag

source comments では `@iframe` block tag を使います。同じ grammar です — 最初の
token が URL、続いて `key=value`:

```js
/**
 * A live demo of the renderer.
 *
 * @iframe https://example.com/embed/demo title="Renderer demo" aspectRatio=16/9
 */
export function render() {}
```

`@iframe` は
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
の `embedBlocks` によって処理されます。有効な `@iframe` はそれぞれ `<Embed>` に
なります。block は symbol の `@example` section の **後** に render されます。
1 つの doclet に複数の `@iframe` を置くことができます。

> [!IMPORTANT]
> `@iframe` は基本の JSDoc が知っている tag ではないので、あなたの config は
> `jsdoc.json` で `tags.allowUnknownTags: true` を set する必要があります
> （この site の
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> はそうしています）。これがないと、JSDoc は theme が見る前に tag を取り除いて
> しまいます。

## 舞台裏

`parseEmbedConfig` は `EmbedSpec` を生成します。
[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
の `embed` builder は self-closing な `<Embed src="…" …/>` MDX JSX node を
出力します（numbers/booleans は stringify され、`undefined` fields は省略され、
component が自身の defaults を適用するようにします）。rang は
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
で `Embed` を register します。component は dwar の loader が hydrate する
`data-island="embed"` marker を render します。live iframe と click-to-load
poster はどちらも **JavaScript なし** で動作します（`<noscript>` fallback
iframe が含まれています）。

## こちらも参照

- [Custom tags](/components/overview) — `@category` / `@order` と並ぶ
  `@iframe`、そして `allowUnknownTags` の要件。
- [Callouts](/components/callouts), [Steps](/components/steps),
  [Tabs](/components/tabs) — その他の authoring primitives。
