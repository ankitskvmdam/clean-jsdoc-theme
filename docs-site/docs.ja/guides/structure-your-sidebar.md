---
title: sidebar を構成する
group: Guides
order: 4
---

# sidebar を構成する

sidebar は、すべてが 1 つの ordering engine
（[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）
に流れ込む複数のレバーから組み立てられます。この page はそれらを結び付けます: group が
どこから来るか、nesting がどう動くか、そして順序を決めるまさにその規則。**すべての
entry が `group` path と任意の `order` を持つ** ことが見えれば、あとはそれに従います。

> [!IMPORTANT]
> **この統一モデルは JSDoc template の挙動です。** TypeDoc の出力は **API
> sidebar** を異なる方法で構築します — kind/category groups ではなく
> module/folder hierarchy です — そのため `@category`、`@order`、
> `sectionOrder`、`clubSidebarItems` は **TypeDoc API tree には効果がありません**。
> それを設定しているなら、そのまま [TypeDoc flavor](#typedoc-flavor) へ進んでください。
> Doc groups（`docGroups` + frontmatter）、`menu`、tutorials は両方で同じように
> 動作します。

> [!NOTE]
> 以下の 2 つの source tags — `@category` と `@order` — は
> [Custom tags](/components/overview) で詳しく文書化されています。この page では
> それら（および config options）が sidebar をどう feed するかをカバーします; tag
> syntax を全面的に再文書化するものではありません。
> [TypeDoc flavor](#typedoc-flavor) までの内容は、特に注記がない限り
> **JSDoc template** について説明しています。

## 統一モデル

navigate 可能なすべての entry — API symbol、guide page、tutorial — は次を持ちます:

- **`group` path**（太字の top-level title、任意で `/`-nested な branch）、および
- 任意の **`order`**（group 内の sort key）。

これらがどこから来るか:

| Source        | `group` の出どころ                                  | `order` の出どころ                 |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| API symbol    | `@category`、なければその kind label（Classes、…）  | `@category … order=`、なければ `@order`|
| Guide page    | frontmatter `group`、なければ directory、なければ default | frontmatter `order`                |
| Tutorial      | tutorial の階層（`Tutorials/<parent>/…`）           | 解決された tree の順序             |

その単一の抽象化こそ、guide と class が sidebar group を共有できる理由です: 両方が
group `Core` に解決されれば、それらは一緒に振り分けられます。

## レバー 1 — `@category` で symbol を group する

> [!NOTE]
> **JSDoc 専用、sidebar のための機能です。** `@category` は TypeDoc bridge でも
> 依然として parse されます（[TypeDoc flavor](#typedoc-flavor) で文書化されている
> とおり）が、TypeDoc API sidebar における symbol の page を移動させることは
> ありません — その sidebar は category groups ではなく module hierarchy です。

source symbol を tag して、その page を kind section ではなく明示的な group に置き
ます:

```ts
/**
 * @category Core
 */
export class Parser {}
```

`@category` は **nest** するための `/`-path を受け付け、加えて inline の `order=`
option も受け付けます:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

これは `Lexer` を **Core ▸ Parsing** の下に置き、その subgroup の中で最初にソートし
ます。2 つの parsing 上の機微、`parseCategory` で検証済み（
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）:

- **group path** は、空白で区切られた token の先頭の連なりです; parsing は `=` を含む
  最初の token で options へ切り替わります。したがって
  `@category Getting Started order=1` は字義どおりの名前 **"Getting Started"** の下に
  group します（space は名前の一部として残ります）、`order` は 1 です。
- group を nest するのは **`/`** であって、space ではありません。`Core/Parsing` は
  nest します; `Getting Started` は、label に space を含む 1 つの flat group です。

## レバー 2 — `@order` で任意の symbol を並べ替える

> [!NOTE]
> **JSDoc 専用、sidebar のための機能です。** `@order` は TypeDoc の API sidebar の
> 順序には効果がありません — module 内の順序はそこでは kind によって固定されて
> います（[TypeDoc flavor](#typedoc-flavor) を参照）。

inline の `order=` option は、`@category` を *持つ* symbol でのみ機能します。**kind
section** に属する symbol（素の `@class`、`@module`、…）を配置するには、単独の
`@order` tag を使います:

```ts
/**
 * @module config
 * @order 1
 */
```

両方が存在するとき、`@category … order=` が `@order` に勝ちます（より具体的で、同じ
場所に置かれた宣言だからです）。
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の `readOrder` を参照してください。

> [!NOTE]
> `@category` と `@order` はどちらも **unknown tags** です — config で
> `tags.allowUnknownTags: true` を設定する必要があります（この repo のすべての example
> config がそうしています）。完全な syntax は [Custom tags](/components/overview) に。

## レバー 3 — nested groups（`/`-paths）

任意の group path — `@category` tag から、guide の frontmatter `group` から、または
guide の directory から — は nest するために `/` を使えます。最初の segment が太字の
top-level title です; より深い segment は **折りたたみ可能な branch node** になります。
nesting は `buildGroupTree`
（[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）
で構築されます。

したがって `@category Core/Parsing`、`docs/core/parsing/` 内の guide、frontmatter
`group: Core/Parsing` は、いずれも page を **Core ▸ Parsing** の下に nest します。

### Leaf-vs-branch ordering（まさにその規則）

1 つの group 階層の中で、`buildGroupTree` は兄弟をソートします — それらは **leaves**
（実際の page links）と **branches**（subgroups）でありえます — 次のように:

1. **有効な順序（effective order）** の昇順で。leaf の有効な順序はそれ自身の `order`
   です; **branch** の有効な順序は **その中の任意の page の最小 `order`** です。した
   がって、1 つの nested page の `order=1` は、その subgroup 全体を上へ浮かせます。
2. 同点の場合、**branches より前に leaves**。
3. その後 first-seen / bucket の順序（つまり順序のない group は変わりません）。

`order` のない pages は最後にソートされ（実質 `+∞`）、その後アルファベット順。これは
guide group がその frontmatter `order` に使うのと同じ規則です。

## レバー 4 — `clubSidebarItems`

> [!NOTE]
> **JSDoc 専用、API tree のための機能です。** `clubSidebarItems` は TypeDoc の
> API sidebar には効果がありません（[TypeDoc flavor](#typedoc-flavor) を参照）。

[`clubSidebarItems`](/theme/configuration#clubsidebaritems) は、label の **最初の `/`
より前の path segment** によって、関連する entry を共有の parent の下にまとめます —
例えば `queue`、`queue/Queue`、`queue/types` は `queue` parent の下に club されます。
1 つの entry にしか共有されない prefix は flat のまま残されます。これは `clubNavTree`
（[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）
が行います。

> [!IMPORTANT]
> Clubbing は、entry が **明示的な `@category` / frontmatter group を持たない**
> bucket — つまり kind-label の fallback section — に **のみ** 適用されます。
> `@category` paths から構築された group は *すでに* `buildGroupTree` で nest されて
> おり、さらに club されることは **ありません**。`assembleNav` の
> `groupEntries.every(e => !e.explicit)` ガードで検証済み。要するに: `@category`
> nesting と label-clubbing は、group ごとに相互排他です。

Clubbing は順序にも配慮します: club された parent はその members の最小 `order` で
ソートされ、bare-prefix の entry（例えば `queue` module 自身）は最初にソートされる
`index` child になります — ただし明示的な `@order` が兄弟を前に引き出さない限り。

ここで併せて知っておくとよいのが
[`collapsibleSidebarSections`](/theme/configuration#collapsiblesidebarsections)
です。*何が* group されるかは変えず、render される top-level section headers
自体（kind labels、`@category` groups、doc groups、`Tutorials`、
`Source Files`）を、default で開いた collapse toggle に変えます。`true`/省略
（すべての section）、`false`（どれも対象外）、または完全一致・大文字小文字を
区別する label の `string[]` を受け付けます。この page の他のどのレバーとも異なり、
**JSDoc と TypeDoc の両方**で同じように動作します — 下記の
[TypeDoc flavor](#typedoc-flavor) を参照してください。

## レバー 5 — `sectionOrder`

> [!NOTE]
> **JSDoc 専用です。** `sectionOrder` は TypeDoc ではまったく効果がありません —
> TypeDoc の API tree は module hierarchy であり、そこでの doc groups は
> `sectionOrder` ではなく [`docGroups`](/theme/configuration#docgroups) で
> 並べ替えられます。[TypeDoc flavor](#typedoc-flavor) を参照してください。

[`sectionOrder`](/theme/configuration#sectionorder) は **top-level** の group を並べ替
えます — kind labels、`@category` 名、doc-group 名を混在させた 1 つの統一された list
です。

- 列挙された label が最初に、あなたの順序で render されます。
- **kind labels** については、これは filter でもあります: 省いた kind label は
  **外されます**。
- **Category / doc groups は省略によって外されることはありません** — それらは列挙
  された section の後ろに追加されます（[`docGroups`](/theme/configuration#docgroups)
  の順序で doc groups、その後残りがアルファベット順）。

これが prose と API section をどう交互に並べるかは
[Combine guides + API](/guides/combine-guides-and-api) を参照してください。

## レバー 6 — `docGroups` / `defaultDocGroup`

- [`docGroups`](/theme/configuration#docgroups) は **doc-group** section を並べ替え、
  それらは API section の **後ろ** に追加されます（ただし doc group が `sectionOrder`
  にも名前があれば、そちらがその位置についての権限を持ちます）。
- [`defaultDocGroup`](/theme/configuration#defaultdocgroup) は、guide が何も宣言しない
  とき — frontmatter `group` もなく、導出する directory もないとき — に入る group
  です。

[Build a guides site](/guides/build-a-guides-site) で端から端までカバーされています。

## レバー 7 — `menu`

[`menu`](/theme/configuration#menu) は、自動の Home / Source Files link を、section の
上の **top region** に置き換えます。各 entry は icon（`lucide:<name>` または
`simpleicons:<name>`）を持ちます。`menu` が設定されると、それが home/source link を
**所有** します — 自動の Home（最初）と Source Files（最後）の entry は抑制され、
あなたが列挙した場合にのみ現れます（`{ id: "home" }` / `{ id: "source" }`）;
external links は inline で現れます。menu の下の section は **依然として**
`sectionOrder` に従います。
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
の `resolveMenuItem` を参照してください; このサイトの
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
は `menu` を使っています。これは TypeDoc にも同様に適用されます。

## TypeDoc flavor

TypeDoc の出力は、その **API sidebar** に対して上記の統一 group/order モデルを
使い**ません**。代わりに TypeDoc 自身の default theme を反映します —
`@category` や kind buckets からではなく、あなたの source layout から構築された
module/folder hierarchy です:

- **Top level はまずあなたの documents、それから folders と modules**、
  アルファベット順 — top-level の kind sections はありません。
- **Folders** はあなたの source の directory structure を反映します。1 つの
  子しか持たない folder は、その子に **merge** されます（`compactFolders`）— 例え
  ば `base/` の下に単独の `Component` がある場合、`base/Component` として表示され
  ます。
- **各 module はクリック可能で展開可能な node です** — その label は module の
  page を開き、その chevron は展開して members を表示します。
- **Members はその module の下に nest され**、**kind** で順序付けられます
  （Enumerations → Classes → Interfaces → Type Aliases → Variables →
  Functions）、その後アルファベット順です。sidebar には kind ごとの
  sub-headings はありません。
- **Namespaces** も同じ方法で node として nest します。

Rendering の詳細（Hierarchy/Implements sections、`@inheritDoc` など）はすべて
[TypeDoc Getting Started](/theme/typedoc-getting-started#the-typedoc-sidebar)
にあります。

### どのレバーが TypeDoc にも適用されるか

| レバー | TypeDoc **API** tree への効果 | それ以外への効果 |
| ----- | ----------------------------------- | ----------------- |
| `@category` | なし — module hierarchy 内の symbol を移動させない | 依然として parse される |
| `@group` | なし — sidebar を駆動しない | 依然として parse される（[TypeDoc Getting Started](/theme/typedoc-getting-started#typedoc-specific-rendering) を参照） |
| `@order` | なし — module 内の kind order は固定 | — |
| `sectionOrder` | なし | なし — 代わりに **doc groups** は `docGroups` で順序付ける |
| `clubSidebarItems` | なし | — |
| `docGroups` / doc frontmatter `group`/`order` | — | **機能する** — prose doc groups を順序付け、API hierarchy の前に render される |
| `menu` | — | **機能する** — JSDoc と同じ top-region の挙動 |
| `collapsibleSidebarSections` | **機能する** — JSDoc と同じ collapse-toggle の挙動 | **機能する** |
| Tutorials | — | **依然として render される** |

> [!NOTE]
> `@category`、`@order`、`sectionOrder`、`clubSidebarItems` とは異なり —
> これらはここでは無効です —
> [`collapsibleSidebarSections`](/theme/configuration#collapsiblesidebarsections)
> は TypeDoc の下でも**適用されます**: これは、この build で実際に render
> される sections に対して解決された、同じ render 済み top-level section
> headers（module/kind/doc-group labels）を折りたたみ可能な headers に変えます。

> [!NOTE]
> `@category`/`@group` に駆動される TypeDoc API sidebar を復元すること
> （TypeDoc 自身の opt-in な category/group navigation に合わせて）は、
> **現在 configurable ではありません**。

## まとめて組み立てる

現実的な混在 config。下記の `sectionOrder` と `clubSidebarItems` は **JSDoc**
タブの API sidebar にのみ影響することに注意してください — TypeDoc タブでは
**まったく効果がありません**（doc-group の順序は `docGroups` から来ますし、
API tree は常に [TypeDoc flavor](#typedoc-flavor) で説明した module hierarchy
として render されます）。

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
opts: {
  // Top-level order: a guide group, then API kinds, then more prose.
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true,
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  // sectionOrder は TypeDoc では効果がありません — API tree は module hierarchy
  // です（上記の "TypeDoc flavor" を参照）。そのためこの key はここでは無視されます。
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  // TypeDoc タブで prose doc groups を順序付けるのは docGroups です。
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true, // TypeDoc には効果なし
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
</tabs>

**JSDoc** については、これを class への `@category Core/Parsing order=1` と guide
への `order:` frontmatter と組み合わせれば、sidebar を上から下まで制御できます。
**TypeDoc** については、API tree は常に [TypeDoc flavor](#typedoc-flavor) の
module hierarchy として render されます — 上記の options に応答するのは、あなたの
doc groups、`menu`、tutorials だけです。

## 次に進む先

- `@category` / `@order` tag リファレンス: [Custom tags](/components/overview)。
- 完全な option 一覧: [Configuration](/theme/configuration)。
- これが結び付ける 2 つの workflow:
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api)。
- TypeDoc sidebar + rendering の全体像:
  [TypeDoc Getting Started](/theme/typedoc-getting-started)。
