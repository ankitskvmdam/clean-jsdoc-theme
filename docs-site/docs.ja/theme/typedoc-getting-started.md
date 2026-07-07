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
| [`menu`](/theme/configuration#menu) | sidebar の上に pin される custom links。それぞれに `lucide:` / `simpleicons:` icon を付けられます。 |
| [`docGroups`](/theme/configuration#docgroups) | sidebar 内の prose **doc groups** の順序を決めます (API section は module 階層です)。 |
| [`copyPage`](/theme/configuration#copypage) | page ごとの "copy page" / "open in LLM" button (デフォルトで on)。 |

> [!NOTE]
> `cleanJsdocTheme` は専用の namespace であるため、その中の未知の keys は常に
> **warn** するだけです ("did you mean?" のヒント付き)。これを error に格上げする
> には [`strict`](/theme/configuration#strict) を参照してください。

## The TypeDoc sidebar

TypeDoc の出力の sidebar は、JSDoc template の kind-bucket layout（top-level の
「Classes」「Interfaces」「Enumerations」…セクション）を使い**ません**。代わりに
**TypeDoc 自身の default theme** を反映します — module/folder hierarchy です:

- **Top level はまずあなたの documents、それから folders と modules**、
  アルファベット順です。top-level の kind sections はありません。
- **Folders** はあなたの source の directory structure から来ます。1 つの子しか
  持たない folder は、その子に **merge** されます（`compactFolders`）— 例えば
  `base/` の下に単独の `Component` がある場合、2 段の nested levels ではなく
  `base/Component` として表示されます。
- **各 module はクリック可能で展開可能な node です**: その label をクリックすると
  module 自身の page が開き、chevron はそれを展開して members を表示します。
- **Members はその module の下に nest され**、**kind** で順序付けられます —
  Enumerations → Classes → Interfaces → Type Aliases → Variables → Functions —
  その後 名前のアルファベット順です。sidebar 自体には kind ごとの sub-headings
  はありません（kind grouping は module 自身の page body には依然として表れます）。
- module 内部に nest された **Namespaces** は、同じ方法で nested nodes として
  表れます。

> [!IMPORTANT]
> これは JSDoc template とは異なる sidebar モデルです。
> [Structure your sidebar](/guides/structure-your-sidebar) に文書化されている
> ordering levers — `@category`、`@order`、`sectionOrder`、`clubSidebarItems` —
> は **TypeDoc API sidebar を形作りません**。上記の module hierarchy がそれを
> 所有し、TypeDoc 自身の defaults に一致します（category/group に駆動される
> navigation は opt-in です）。category/group に駆動される TypeDoc nav を復元
> することは、**現在 configurable ではありません**。
>
> TypeDoc に対して依然として機能するもの: prose の **doc groups**（`docGroups` +
> doc page の frontmatter `group` / `order`）は依然として render され — API
> hierarchy の前に — `docGroups` を介して順序付けられます; **`menu`** の
> top region は依然として機能します; tutorials は依然として render されます。
> 完全な内訳は
> [Structure your sidebar](/guides/structure-your-sidebar#typedoc-flavor)
> を参照してください。

## TypeDoc-specific rendering

sidebar 以外にも、TypeDoc の出力は JSDoc template にはないいくつかのものを
render します。TypeDoc 自身の分析から来るものだからです:

- **Inheritance と関係性。** Class と interface の pages は **Hierarchy** list
  （祖先の chain）、**Implements** section、**Implemented By** section を得ます。
  個々の members は captions を得ます — **Inherited from …**、**Overrides …**、
  **Implementation of …** — 関連する symbol を指します。
- **`@group`。** `@category` の sibling として認識されます。parse はされますが、
  `@category` と同様に、default の TypeDoc sidebar を駆動する**ことはありません**
  （上記を参照）。
- **Native TypeDoc `projectDocuments`。** TypeDoc 自身の
  [`projectDocuments`](https://typedoc.org/options/input/#projectdocuments)
  option を介して添付された Markdown files は pages として render されます。
  これは theme 自身の [`docs`](/theme/configuration#docs) option とは
  **異なります**:
  - [`docs`](/theme/configuration#docs) は theme の prose-docs directory です —
    JSDoc と TypeDoc の両方で同じように動作します。
  - `projectDocuments` は TypeDoc-native な input で、TypeDoc の出力にのみ
    利用可能です。

  どちらも最終的には site の中の普通の pages になるので、どの tool に file list
  を持たせたいかで選んでください: 共有された、tool-agnostic な guides folder
  には `docs` を使い、すでに TypeDoc-native な方法で docs を整理しているなら
  `projectDocuments` を使ってください。
- **`@inheritDoc`。** `{@inheritDoc Target}`（あるいは、override/implement する
  member 上の bare な `@inheritDoc`）で文書化された member は、その場所に target
  の description と parameter/return docs を表示します。TypeDoc が reference を
  resolve し、theme はその結果得られた content を render します —
  default の TypeDoc semantics に一致します。
- **Async modifier badge。** `async` な（あるいは `Promise` を返す）methods は、
  その signature の隣に **async** modifier badge を表示します。
- **Object-literal type の展開。** parameter、return type、あるいは
  type alias/variable 上の inline な object-literal type は、**property table**
  へと展開されます: member ごとに 1 行で、name、type、optional flag、
  description を持ちます。table 内の type references は、それが文書化された
  pages への **link** のままです。

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
  付けのレバー（これが JSDoc とどう異なるかについては、その **TypeDoc flavor**
  section を参照してください）。
- **[Authoring](/components/callouts)** — callouts、steps、tabs、embeds。
- **[Localize your docs](/guides/localize-your-docs)** — 複数言語のワークフロー
  (extract は TypeDoc で動作します。localized builds は今のところ JSDoc 専用です)。
- **[Packages](/#the-packages)** — 共有の `setu → dwar` pipeline (および
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) が裏側でどう動くか。
