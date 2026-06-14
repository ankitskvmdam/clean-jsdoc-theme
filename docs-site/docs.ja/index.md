---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)
[![npm version](https://img.shields.io/npm/v/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![npm downloads](https://img.shields.io/npm/dm/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![GitHub stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)
[![License](https://img.shields.io/npm/l/clean-jsdoc-theme.svg?color=005bff)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)

**clean-jsdoc-theme** は JavaScript および TypeScript プロジェクト向けの
完全な documentation suite であり、単に JSDoc の output に化粧を施しただけのもの
ではありません。**JSDoc** _または_ **TypeDoc** プロジェクトに対して指定すると、
これらの tools は裏側であなたの source comments を収集するためだけに使われます。
そこから先はこの theme が引き継ぎ、あなたの API の structured model を構築して、
高速でモダンな static site を render します。すなわち server-rendered HTML、
遅延 hydrate される interactive islands、組み込みの fuzzy command palette
(`Ctrl K`)、full-text search、そして first-class な light テーマと dark テーマ
です。

これは LLMs のためにも作られています。各 page と並んで、large language models
が読んで理解しやすいように書かれた companion `.md` も出力します。つまりあなたの
API reference は、人間にとってと同じくらい AI にとっても読みやすいのです。
さらにすべての API page には、その Markdown をコピーしたり、page を直接 Claude、
ChatGPT、または Perplexity で開いたりできる one-click actions も備わっています
(いずれも不要であれば opt-out 可能です)。

## 得られるもの

### セットアップ不要の 2 種類の search

titles、descriptions、および page 全文にわたってランク付けする `Ctrl K` fuzzy
command palette。どの class member にも名前で直接 deep-link します。オプションの
Pagefind full-text index は flag 一つで有効にできます。

### 一つの site に prose と API

手書きの Markdown guides が、あなたの JSDoc または TypeDoc comments から
auto-generate された reference のすぐ隣に並びます。一つの sidebar、一つの search
index、一つの URL space です。Markdown files の folder に対して指定すれば、folder
のレイアウトとわずかな frontmatter があなたの navigation になります。この site の
prose pages、今あなたが読んでいるこの page も含めて、まさにそうです。`{@link}`
と `@see` は本物の cross-page anchors に resolve され、すべての member はその正確
な source line にリンクします。

### リッチでインタラクティブなコンテンツ

Tabbed code blocks、copy-to-clipboard、info と warning の callouts、sandboxed
live embeds (CodePen など)、そしてリンクした正確な line を開く Monaco-powered な
source viewer。

### 高速で framework-free

遅延 hydrate される Preact islands を伴う server-rendered HTML。各 island はそれ
を使う pages にのみ配信されます。回線に送り込む client framework もなければ、
維持すべき build config もありません。

### light と dark、箱から出してすぐ使える

OKLCH palette 上の first-class な light テーマと dark テーマ。CSS は不要です。
好きなときに自分の site name や logo、Google Fonts、sidebar menu、そして
custom CSS/JS を持ち込めます。

### どんな言語でも提供できる

組み込みの localization。あなたの locales を宣言すると、`clean-jsdoc` CLI が言語
ごとに 1 つの static site を構築します。translated UI、API descriptions、そして
prose が、header の language switcher、言語ごとの fonts、SEO 向けの `hreflang`
とともに提供されます。
[Localize your docs](/guides/localize-your-docs) を参照してください。

### LLMs のために作られている

各 page は machine reading 向けに書かれた companion `.md` を出力し、加えて
opt-out 可能な "copy page" と "open in Claude / ChatGPT / Perplexity" の actions
を備えています。これにより AI は、あなたの users が読むのと同じ reference を読み
ます。

### 箱から出してすぐ使える AI skill

どんな coding assistant も `clean-jsdoc-theme` の専門家に変える、ダウンロード
可能な [**skill**](/theme/llm-skill)。agent をそれに向けてくつろいでいるあいだ
に、初回からあなたの config を設定し、guides を執筆し、sidebar を正しく structure
します。prompt-engineering も当て推量も不要です。

## パッケージ

`clean-jsdoc-theme` は単一の template ではありません。裏側では、一方向の
`setu → dwar` pipeline に組み込まれた single-responsibility packages の小さな集合
です。あなたの source comments が一方の端から入り、もう一方の端から高速で
static な LLM-friendly site が出てきます。この core が共有されているため、
同じ部品が JSDoc と TypeDoc の両方の entry points を動かします。

ほとんどの users はこれらに直接触れることはありません。entry point を install し、
いくつかの [options](/theme/configuration) を設定すれば完了です。とはいえ、
すべての building block は **npm に published** され、
documented で、再利用可能です。

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (with components from rang) → static site](/assets/build-pipeline.svg)

### コア pipeline

**setu** はあなたの comments を `SiteManifest` に変換します。**dwar** はその
manifest を **rang** の Preact components を使って HTML/CSS/JS に render します。
**utils** には、boundary contract を定義する共有 types と Zod schemas が含まれて
います。

| Package | 役割 | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/utils`](https://www.npmjs.com/package/@clean-jsdoc-theme/utils) | 共有 types、Zod schemas、そして他のすべての package がそれに対して構築する `SiteManifest` contract。 | [Overview](/packages/utils-overview) · [Examples](/packages/utils-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils) |
| [`@clean-jsdoc-theme/setu`](https://www.npmjs.com/package/@clean-jsdoc-theme/setu) | JSDoc doclets を pages、nav、cross-resolved links に process し、`SiteManifest` を出力します。I/O は行いません。 | [Overview](/packages/setu-overview) · [Examples](/packages/setu-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu) |
| [`@clean-jsdoc-theme/rang`](https://www.npmjs.com/package/@clean-jsdoc-theme/rang) | Preact component library、MDX component map、island registry。dwar が SSR と hydration のために bundle する UI です。 | [Overview](/packages/rang-overview) · [Examples](/packages/rang-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang) |
| [`@clean-jsdoc-theme/dwar`](https://www.npmjs.com/package/@clean-jsdoc-theme/dwar) | `SiteManifest` を in-memory の HTML/CSS/JS に render します (Preact + MDX + utility CSS + esbuild islands)。加えて Pagefind hook も。Pure です。 | [Overview](/packages/dwar-overview) · [Examples](/packages/dwar-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar) |

### Entry points

これらがあなたが実際に install するものです。それぞれが、あなたの docs を同じ
`setu → dwar` core に通します。JSDoc は `publish` bridge を経由し、TypeDoc は
registered output を経由します。

| Package | 役割 | Getting started | Source |
| --- | --- | --- | --- |
| [`clean-jsdoc-theme`](https://www.npmjs.com/package/clean-jsdoc-theme) | JSDoc template。JSDoc はその `publish()` bridge を call し、それが setu → dwar を orchestrate して files を書き出します。 | [JSDoc Getting Started](/theme/jsdoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme) |
| [`@clean-jsdoc-theme/typedoc`](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc) | TypeDoc plugin。reflection → setu → dwar を実行する `clean-jsdoc-theme` output を register します。 | [TypeDoc Getting Started](/theme/typedoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) |

### Localization

あなたの docs を複数言語で ship しましょう。**aadesh** は extract → translate →
build のワークフローを駆動する `clean-jsdoc` CLI です。**bhasha** は build と UI
が共有する、pure で browser-safe な i18n core (catalog、translator、key scheme)
です。まずは [Localize your docs](/guides/localize-your-docs) から始めてください。

| Package | 役割 | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/aadesh`](https://www.npmjs.com/package/@clean-jsdoc-theme/aadesh) | `clean-jsdoc` localization CLI。extract、translate-prompt、validate を行い、locale ごとに 1 つの site を build します。 | [Overview](/packages/aadesh-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh) |
| [`@clean-jsdoc-theme/bhasha`](https://www.npmjs.com/package/@clean-jsdoc-theme/bhasha) | isomorphic な i18n core: chrome catalog、`t` translator、`LanguageProvider`、そして API の key/hash scheme。 | [Overview](/packages/bhasha-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha) |

これらの boundaries は意図的に一方向です。**setu** は dwar や rang を決して
import せず、**dwar** は `SiteManifest` のみを consume し、`render()` は pure です。
これこそが、両方の entry points が重複した logic なしに一つの rendering core を
共有できる理由です。プロジェクトがこのように分割されている理由については
[Overview](/theme/overview) を参照してください。手書きの guides を生成された
reference と組み合わせるには [Combining guides and
API](/guides/combine-guides-and-api) を参照してください。

## 次はどこへ

- **Getting Started** — install して、[JSDoc](/theme/jsdoc-getting-started) または
  [TypeDoc](/theme/typedoc-getting-started) をあなたのプロジェクトに向けます。
- **[API Reference](/api-docs/)** — 小さな sample module から構築された、
  theme-generated な API reference の実例です。
