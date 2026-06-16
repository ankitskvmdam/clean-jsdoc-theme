---
title: TypeDoc で始める
group: Using the Theme
order: 3
---

# TypeDoc で始める

TypeScript projects 向けに、theme は **TypeDoc plugin** として ship されます —
`@clean-jsdoc-theme/typedoc`。これは TypeDoc の default を拡張する CSS theme では
ありません。custom な **output** を register し、TypeDoc の reflections を JSDoc
bridge と *同じ* `setu → dwar` pipeline に通します。その結果、あなたの TypeScript
sources から、同一の site — SSR HTML、islands、fuzzy + full-text search、companion
`.md` — が生成されます。

> [!NOTE]
> **どう組み込まれるか。** plugin の
> [`load(app)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/index.ts)
> は 1 つの option block (`cleanJsdocTheme`、参照:
> [`options.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/options.ts))
> を宣言し、`app.outputs.addOutput(...)` を介して `clean-jsdoc-theme` という名前の
> output を register します。writer
> ([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
> が reflections → doclets → 共有 pipeline へと適合させます。つまり 2 通りの方法で
> 選択します: `plugin` がそれを load し、`outputs` がそれを有効にします。

## Install と build

<steps>

<step label="Install">

TypeDoc と theme の TypeDoc plugin を dev dependencies として install します:

<tabs>

<tab label="npm">

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

</tab>

</tabs>

</step>

<step label="Configure">

`typedoc.json` を追加します。plugin を load し、それを **output** として選択し、
theme options を **`cleanJsdocTheme`** key の下に置きます (JSDoc の `opts` に対応
する TypeDoc の対応物です):

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",

  // plugin を load し、それから render する output を選択します。
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],

  // Theme options はここに置きます。
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</step>

<step label="Build">

TypeDoc を実行します。register された output を `outputs[].path` に render します:

```sh
npx typedoc
```

</step>

<step label="Serve">

`dist/index.html` を開くか、folder を serve します (Pagefind の full-text index は
load に HTTP を必要とします):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> 完全で実行可能な TypeDoc setup が repo の
> [`examples/typedoc-basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/typedoc-basic)
> にあります。その
> [`typedoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/typedoc-basic/typedoc.json)
> が上記 setup の reference です。

## options はどこに置くか

すべての theme option は JSDoc 用のものと同じです。異なるのは場所だけで、`opts`
ではなく **`cleanJsdocTheme`** の下に置かれます。完全な一覧は、両方の形式を並べて
[Configuration](/theme/configuration) page にあります。手始めにいくつかを挙げます:

| Option | 役割 |
| ------ | ------------ |
| [`siteName`](/theme/configuration#sitename) | Header の title — プレーンテキスト、または `alt` fallback text を伴う `light`/`dark` の logo セット。 |
| [`fonts`](/theme/configuration#fonts) | `heading` / `body` (Google Fonts、あなたのために load されます) と `mono` を override します。 |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | light / dark palettes を塗り替えます。`bg`、`accent` … だけを override し、残りはそのままにします。 |
| [`sectionOrder`](/theme/configuration#sectionorder) | top-level の sidebar sections の順序を決めます。 |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | 関連する entries を共有の collapsible parent の下にまとめます。 |
| [`menu`](/theme/configuration#menu) | sidebar の上に pin される custom links。それぞれに `lucide:` / `simpleicons:` icon を付けられます。 |
| [`copyPage`](/theme/configuration#copypage) | page ごとの "copy page" / "open in LLM" button (デフォルトで on)。 |

> [!NOTE]
> `cleanJsdocTheme` は専用の namespace であるため、その中の未知の keys は常に
> **warn** するだけです ("did you mean?" のヒント付き)。これを error に格上げする
> には [`strict`](/theme/configuration#strict) を参照してください。

## 複数言語

localization workflow は、その locales を同じ `cleanJsdocTheme` block 内で宣言し
(`locales` + `defaultLocale`)、`clean-jsdoc` CLI を通じて実行します。
**[Localize your docs](/guides/localize-your-docs)** と
[`locales` / `defaultLocale`](/theme/configuration#localization) reference を参照
してください。

> [!INFO]
> 現在、TypeDoc bridge は translation catalogs を **extract** できますが、
> per-locale sites はまだ render しません。localized な *builds* は今のところ
> JSDoc 専用です。単一言語の TypeDoc site は完全にサポートされています。

## 次のステップ

- **[Build an API reference](/guides/build-an-api-reference)** — 何が page になる
  のか、そして source-file viewer がどう動くか。
- **[Build a guides site](/guides/build-a-guides-site)** と
  **[Combine guides + API](/guides/combine-guides-and-api)** — 同じ site に手書きの
  Markdown を追加します。
- **[Structure your sidebar](/guides/structure-your-sidebar)** — グループ化と順序
  付けのレバー。
- **[Authoring](/components/callouts)** — callouts、steps、tabs、embeds。
- **[Localize your docs](/guides/localize-your-docs)** — 複数言語のワークフロー
  (extract は TypeDoc で動作します。localized builds は今のところ JSDoc 専用です)。
- **[Packages](/#the-packages)** — 共有の `setu → dwar` pipeline (および
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) が裏側でどう動くか。
