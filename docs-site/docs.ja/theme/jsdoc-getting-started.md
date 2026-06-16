---
title: JSDoc で始める
group: Using the Theme
order: 2
---

# JSDoc で始める

`clean-jsdoc-theme` は **JSDoc template** です。JSDoc はいつもどおりのこと、
つまりあなたの source を parse して doc comments を収集すること、を行い、それから
template の `publish` function に処理を引き渡します。ここからこの theme が引き継ぎ、
static site を構築します。JSDoc を theme に向けるだけで完了です。

> [!NOTE]
> **どう組み込まれるか。** JSDoc は template をその exported な `publish` function
> を call することで load します。ここではそれが
> [`publish(data, opts, tutorials)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
> です (package の `main`、`dist/publish.js`)。これはあなたの doclet collection を
> 受け取り、`setu → dwar` pipeline に通します。各 stage が何をするかは
> [Packages](/) を参照してください。

## Install と build

<steps>

<step label="Install">

JSDoc と theme を dev dependencies として install します:

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Configure">

project root に `jsdoc.json` を追加します。小さくとも実用的な出発点は次のとおりです:

```json5
{
  source: { include: ["./src", "./README.md"] },

  // 必須 — 下の警告を参照してください。
  plugins: ["plugins/markdown"],

  opts: {
    // JSDoc を theme に向けます。CLI での `jsdoc -t <path>` と同等です。
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** plugin は必須です。JSDoc は、theme が見る前に doc comments
> 内の Markdown を **HTML** に render し、theme はその HTML を consume します (参照:
> [`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts))。
> これがないと、descriptions は生の、フォーマットされていない text として届きます。

</step>

<step label="Build">

config に対して JSDoc を実行します:

```sh
npx jsdoc -c jsdoc.json
```

</step>

<step label="Serve">

site は `dist/` に書き出されます。`dist/index.html` を開くか、folder を serve します
(Pagefind の full-text index は load に HTTP を必要とします):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> 完全で実行可能な JSDoc setup が repo の
> [`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic)
> にあります。その
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)
> と source comments は、この page のすべての内容の reference です。

## options はどこに置くか

theme options は `jsdoc.json` の **`opts`** の下に、JSDoc 自身の options と並んで
置かれます。最初に手を伸ばしたくなるいくつかを挙げます。完全な一覧は、TypeDoc 形式
と並べて [Configuration](/theme/configuration) page にあります。

| Option | 役割 |
| ------ | ------------ |
| [`siteName`](/theme/configuration#sitename) | Header の title — プレーンテキスト、または `alt` fallback text を伴う `light`/`dark` の logo セット。 |
| [`fonts`](/theme/configuration#fonts) | `heading` / `body` (Google Fonts、あなたのために load されます) と `mono` を override します。 |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | light / dark palettes を塗り替えます。`bg`、`accent` … だけを override し、残りはそのままにします。 |
| [`sectionOrder`](/theme/configuration#sectionorder) | top-level の sidebar sections の順序を決めます。 |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | 関連する entries を共有の collapsible parent の下にまとめます。 |
| [`menu`](/theme/configuration#menu) | sidebar の上に pin される custom links。それぞれに `lucide:` / `simpleicons:` icon を付けられます。 |
| [`tutorials`](/theme/configuration#tutorials) / [`docs`](/theme/configuration#docs) | 手書きの Markdown guides を、生成された reference の隣に render します。 |
| [`copyPage`](/theme/configuration#copypage) | page ごとの "copy page" / "open in LLM" button (デフォルトで on)。 |

> [!NOTE]
> いくつかの options — [`outputSourceFiles`](/theme/configuration#outputsourcefiles)
> と [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment) — は JSDoc
> 専用で、`opts` ではなく `templates.default` の下に置かれます (theme はそれらを
> `jsdoc/env` から読み取ります)。これらは Configuration page で印が付いています。

## 複数言語

theme はあなたの docs を **複数言語** で render できます。locale ごとに 1 つの
static site (デフォルトは root に、その他は `/<locale>` の下) と、header の
language switcher が用意されます。`opts.locales` で locales を宣言し、それから
`clean-jsdoc` CLI で translation と per-locale builds を駆動します:

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
  defaultLocale: "en",
}
```

`locales` のない build には影響しません。完全なワークフロー (`extract` →
translate → `build`) については
**[Localize your docs](/guides/localize-your-docs)** を、そして
[`locales` / `defaultLocale`](/theme/configuration#localization) reference も
参照してください。

## 次のステップ

- **[Build an API reference](/guides/build-an-api-reference)** — 何が page になる
  のか、source-file viewer、そして `Source: file:line` links。
- **[Build a guides site](/guides/build-a-guides-site)** と
  **[Combine guides + API](/guides/combine-guides-and-api)** — 同じ site に手書きの
  Markdown を追加します。
- **[Structure your sidebar](/guides/structure-your-sidebar)** — `@category`、
  `@order`、そして sidebar options。
- **[Authoring](/components/callouts)** — comments や prose で使える callouts、steps、
  tabs、embeds。
- **[Localize your docs](/guides/localize-your-docs)** — site を複数言語で ship
  します。
- TypeScript がお好みですか？ **[TypeDoc Getting Started](/theme/typedoc-getting-started)**
  を参照してください。同じ output、異なる toolchain です。
