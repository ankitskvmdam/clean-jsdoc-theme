---
title: API reference を作る
group: Guides
order: 1
---

# API reference を作る

これは **pure-API** な workflow です。tool を自分の source code に指し示し、doc
comments から reference サイトを生成させます — class、module、namespace などごとに
1 page、加えて任意の source-file viewer。
[API demo](/api-docs/) はこれをもとに、
[`docs-site/jsdoc.api.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.api.json)
を使って作られています。

> [!TIP]
> 手書きの guides もすでにありますか？どちらかを選ぶ必要はありません — 両方を 1 つの
> サイトで届けるには
> [Combine guides + API](/guides/combine-guides-and-api) を参照してください。

## セットアップする

toolchain のセットアップ全体は getting-started guides にあります; この page では何が
page になるか、source viewer がどう動くかに焦点を当てます。tool を選んでください:

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

`source.include` を自分の code に指し示します。install + build の手順については
[JSDoc Getting Started](/theme/jsdoc-getting-started) を参照してください。

```json5
{
  source: { include: ["./src", "./README.md"] },
  // Required: pre-renders Markdown in your doc comments to HTML.
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** plugin は必須です。これがないと build はすぐに失敗します
> — theme は、あなたの doc-comment Markdown がすでに HTML に render されていることを
> 前提としています。

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

`entryPoints` を自分の code に指し示し、theme plugin を load します。セットアップ
全体については [TypeDoc Getting Started](/theme/typedoc-getting-started) を参照して
ください。

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</tab>
</tabs>

## 何が page になるか

setu はあなたの documented symbol を列挙し、それぞれを page に変えます。**それ自身の**
page を得る kind は **container kinds** で、この順序で構築されます（
[`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
の `CONTAINER_KINDS` を参照）:

| Kind        | Sidebar section |
| ----------- | --------------- |
| `module`    | Modules         |
| `namespace` | Namespaces      |
| `class`     | Classes         |
| `interface` | Interfaces      |
| `mixin`     | Mixins          |
| `typedef`   | Typedefs        |

それぞれが同じ container path を通して render された 1 page を得て、その members は
section に振り分けられます。**Typedefs は first-class です** — それらは同一の
`buildContainerPage` path を通るため、typedef の `@type`、`@property` list、そして
（function-signature typedefs の場合）`@param`/`@returns` がすべてその page に render
されます。

> [!NOTE]
> 上記の順序は **slug-collision precedence** でもあります: 2 つの symbol が同じ slug
> を要求するとき、先の kind が勝ちます（つまり `module` は後の `class` を破ります）。
> `CONTAINER_KINDS` の ordering と
> [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
> の dedup pass で検証済み。

### Globals page

それ自身の page をまだ得ていないすべての **global-scope** symbol — functions、
members、constants、enums、events — は、1 つの synthetic な **Globals** page（slug
`global`）に集められます。除外される kind はちょうど上記の container kinds に加えて
`typedef` で、それらはすでに standalone で render されるためです。該当する globals が
なければ、Globals page は出力されません。
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の `buildGlobalsView` を参照してください。

section mapping のない symbol kind は catch-all の **Other** section に入り、最後に
追加されます — 実際には空のままのセーフティネットです。

## source-file viewer

source viewing が on のとき、theme は各 project source file を読み取り専用の
syntax-highlighted な viewer page として render し、**Source Files** index を作り、
各 documented member をその declaration へ `Source: file:line` link で結び付けます。

これは JSDoc の [`outputSourceFiles`](/theme/configuration#outputsourcefiles) で
gate されます（default **on**）。これは `templates.default` の下にある JSDoc-only な
option です:

```json5
// jsdoc.json — turn the source viewer OFF
templates: { default: { outputSourceFiles: false } }
```

link がどう解決されるか（
[`packages/setu/src/source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)
を参照）:

- 各 file は `source/<slugified-path>` に hidden な `kind: 'source'` page になります;
  language は拡張子から検出されます（Monaco ids — `js`/`mjs`/`jsx` →
  `javascript`、`ts`/`mts`/`tsx` → `typescript`、など）。
- member の `Source:` link は、ある行（`#L<n>`）に anchored された file page を指し
  ます。**default** では、先頭の doc-comment block を飛ばして、実際の **declaration**
  の最初の行に着地します。代わりに comment の冒頭行に着地させるには
  [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment)（`true`）を設定
  します（v5 以前の挙動）。
- "Source Files" index は sidebar で常に最後です。`{ id: "source" }` で menu item
  として表に出すこともできます（
  [`examples/basic/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)
  を参照）。

> [!CAUTION]
> `outputSourceFiles` と `sourceLinkToComment` option は **JSDoc-only** です — それら
> は `opts`/`cleanJsdocTheme` の下ではなく `templates.default` の下にあります。TypeDoc
> projects にはありません。

## API sidebar を並べ替える

default では kind section は固定の順序で render されます（Classes、Modules、
Namespaces、Mixins、Interfaces、Typedefs、Globals、…）。
[`sectionOrder`](/theme/configuration#sectionorder) でそれを override し、より細かい
制御には symbol に `@category` / `@order` tags を使います。これはそれ自体が 1 つの
トピックです — [Structure your sidebar](/guides/structure-your-sidebar) があらゆる
レバーをカバーします。

## 次に進む先

- reference の隣に手書きの guides を追加する:
  [Combine guides + API](/guides/combine-guides-and-api)。
- カスタム source tags（`@category`、`@order`）: [Custom tags](/authoring/custom-tags)。
- すべての option を詳しく: [Configuration](/theme/configuration)。
- package の内部: [Packages](/#the-packages)。
