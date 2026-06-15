---
title: docs を localize する
group: Guides
order: 5
---

# docs を localize する

clean-jsdoc-theme は、あなたの documentation を **複数の言語** で届けられます。各
locale はそれ自身の static output に render されます — default の言語は root に、
ほかは `/<locale>` の下に — そして header の language switcher がそれらの間を navigate
します。3 種類の content が翻訳されます:

| Content | Source | どうやって |
| --- | --- | --- |
| **UI chrome**（search、settings、nav labels） | key→string catalog | locale JSON で翻訳 |
| **API descriptions**（class/member/param/return の prose） | あなたの doclets | locale JSON で翻訳 |
| **Prose**（home page、docs pages） | locale ごとの files | `README.<locale>.md` + `docs.<locale>/` |

workflow は [`clean-jsdoc`](/packages/aadesh-overview) CLI（**aadesh** package）を
通して走り、その背後を純粋な i18n core（[**bhasha**](/packages/bhasha-overview)）が
支えます。

> [!NOTE]
> CLI を theme と並べて install します:
> `pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh`

> [!INFO]
> Localized な **builds** は今のところ JSDoc-only です。TypeDoc bridge は catalogs を
> *extract* できますが、まだ locale ごとのサイトを render しません — 完全な多言語
> output は JSDoc path にあります。

## 1. locale を宣言する

Locales は既存の `jsdoc.json` opts に置かれます（TypeDoc: `cleanJsdocTheme` block）—
別の config file はありません:

```json
{
  "opts": {
    "destination": "dist",
    "readme": "./README.md",
    "docs": "docs",
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" },
      { "code": "hi", "name": "हिन्दी" }
    ],
    "defaultLocale": "en"
  }
}
```

`{ code, name }`（または素の `"en"` string）の list に default を加えたものです。
`name` は switcher の label で、code は BCP-47 ふうです（`en`、`pt-BR`）。
`defaultLocale` は任意です — それは list の最初の locale に default します。
single-locale な（または `locales` のない）build は影響を受けません — 以前とまったく
同じように render されます。

## 2. catalog を extract する

```sh
clean-jsdoc i18n extract
```

これはあなたの pipeline を走らせ、翻訳可能なすべての string（chrome + API）を集め、
`clean-jsdoc-theme-artifacts/locales/` の下に locale ごとに 1 つの commit 可能な
catalog を書き出します:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # the skeleton — values ARE the source text
  en.meta.json   # auto-managed bookkeeping (don't edit)
  ja.json        # values blank until you translate them
  ja.meta.json
  ...
```

docs が変わるたびに `extract` を再実行します — これは **merge** します: 新しい key が
追加され、変わった source は key を stale としてマークし、削除された key は soft-delete
されます（`--prune` まで保持）。変更のない run は git diff がゼロになります。

## 3. 翻訳する

各 locale の `<code>.json` を手で edit するか、LLM 用に prompt を生成します:

```sh
clean-jsdoc i18n prompt
```

`prompt` は locale ごとに、すぐ使える prompt **file** を
`clean-jsdoc-theme-artifacts/locales/prompts/` の下に書き出します — 小さな catalog
には `<code>.md`、context の上限のために chunk された `<code>.part-01.md`、
`<code>.part-02.md`、…。各 file には untranslated と stale な entry だけが入り、
markdown、`{@link}`、code fences、`{var}` の interpolation token を保持するよう指示
が添えられます。CLI は file がどこに置かれたかを表示します:

```text
ja: 60 entries → 2 prompt files:
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-01.md
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-02.md
```

各 file を開いて、その内容を LLM に paste します — または `.md` を直接 upload します —
それから返ってきた翻訳を、対応する `<code>.json` catalog にコピーして戻します。
（prompts directory は実行のたびに再生成され git-ignored なので、commit を散らかすこと
は決してありません。）

すべてを翻訳する必要はありません — 空のままにしたものは default の言語に fallback する
ので、部分的に翻訳されたサイトでも問題ありません（カバレッジは report に表示されます）。

## 4. Validate する（任意）

```sh
clean-jsdoc i18n validate          # warns on gaps, errors on malformations
clean-jsdoc i18n validate --strict # gaps become failures too (for CI)
```

## 5. Build する

```sh
clean-jsdoc build
```

locale ごとに 1 つのサイト: default locale は `destination` に、ほかの各 locale は
`destination/<locale>` の下に。language switcher と `hreflang` の alternate は、各
page が実際に存在する locale の集合から自動的に wire されます。

## prose を localize する

Catalogs は chrome と API reference をカバーします。自由形式の prose は **file** ごと
に localize されます — extraction はありません:

- **Home page** — 設定した README の隣に `README.<locale>.md` を追加します
  （`README.ja.md`、`README.hi.md`、…）。aadesh はそれをその locale の home として
  render します; variant が欠けていれば default README に fallback します。
- **Docs pages** — `opts.docs` folder の隣に sibling の `docs.<locale>/` directory を
  追加し、翻訳したい file を翻訳します。これは default docs を **file ごとに** overlay
  します: 翻訳された page が勝ち、欠けているものは default に fallback します。した
  がって locale は、実際に翻訳した page だけを必要とします。

```
README.md            docs/                 # default language
README.ja.md         docs.ja/              # Japanese overlay (translate what you want)
README.hi.md         docs.hi/              # Hindi overlay
```

> [!TIP]
> doc の `group` frontmatter の値は locale 全体で同じに保ってください（`title` を翻訳
> し、`group` は翻訳しない）— さもないと同じ section が 2 つの sidebar group に分裂し
> かねません。

## 言語ごとの fonts

Latin の display font で render された翻訳済み heading は、CJK や Devanagari では誤って
見えることがあります。`opts.fonts` の中で `<locale>:` prefix を使って font を locale
ごとに override します — prefix のないものはすべて default で、slot を省いた locale は
それに fallback します:

```json
{
  "opts": {
    "fonts": {
      "heading": "Source Serif 4",
      "body": "Roboto",
      "ja:heading": "Noto Sans JP",
      "ja:body": "Noto Sans JP",
      "hi:heading": "Noto Sans Devanagari",
      "hi:body": "Noto Sans Devanagari"
    }
  }
}
```

各 locale の build は、その後 Google Fonts から自分自身の families だけを要求します。

## Interactive mode

ガイド付きの run のほうが好みですか？CLI を引数なしで invoke します:

```sh
clean-jsdoc
```

welcome banner と command picker が開き、各 command の options を尋ね、同等の command
をあなたの `package.json` scripts に保存するよう提案します。

## 完全な例

repo の [`examples/with-i18n-example`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/with-i18n-example)
を参照してください — 翻訳された API descriptions、chrome、locale ごとの home page、
localized な **Guide** docs section（部分的な翻訳を示すための意図的な fallback 付き）、
そして言語ごとの fonts を備えた、3 つの locale（en / ja / hi）の project です。

## 次へ

- [aadesh Overview](/packages/aadesh-overview) — CLI を詳しく。
- [bhasha Overview](/packages/bhasha-overview) — i18n core。
- [Configuration](/theme/configuration) — すべての theme option。
