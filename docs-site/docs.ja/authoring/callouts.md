---
title: Callouts
group: Authoring
order: 1
---

# Callouts

> [!NOTE]
> **どこで使えるか — prose と API docs。** callouts は任意の prose（README、
> tutorials、docs directory）の中で書くことができ、theme はあなたの source の
> `@deprecated` doc-comment tag からも自動的に callout を出力します。

Callouts は型付きの色付き通知ボックスです — tip、warning、あるいは重要な補足の
ために使うようなものです。これらは **GitHub-style alert blockquotes** として
書きます。すなわち、最初の行が `[!TYPE]` marker である通常の blockquote です。

これは theme が render するあらゆる prose で動作します — あなたの README、
tutorials、そして docs directory — なぜならこの promotion は共有 HTML
normalization pass の中で
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
にて起こるからです。

## Syntax

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming.
```

このように render されます:

> [!NOTE]
> Useful information that users should know, even when skimming.

Marker は blockquote の内側の最初の要素でなければなりません（`blockquoteToCallout`
は最初の text node からそれを読み取り、`^\s*\[!(\w+)\]\s*` でマッチします）。
Marker は body から取り除かれ、それ以降のすべてが callout content になります。
marker が無い、または認識されない場合、blockquote は通常の quote のまま残ります。

## 4 つの variant とその markers

callout variant はちょうど **4 つ** です — `info`、`tip`、`warning`、
`error`。いくつもの GitHub-style keyword がそれぞれに畳み込まれます。これは
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
の完全な `CALLOUT_ALERTS` map です。marker は **case-insensitive** です（lookup
の前に lower-case 化されます）:

| Marker you write | Variant |
| ---------------- | ------- |
| `[!INFO]`        | info    |
| `[!NOTE]`        | info    |
| `[!IMPORTANT]`   | info    |
| `[!TIP]`         | tip     |
| `[!SUCCESS]`     | tip     |
| `[!WARNING]`     | warning |
| `[!CAUTION]`     | warning |
| `[!ERROR]`       | error   |
| `[!DANGER]`      | error   |

したがって `[!NOTE]` と `[!IMPORTANT]` はどちらも青い **info** ボックスを作り、
`[!TIP]` と `[!SUCCESS]` は緑の **tip** ボックス、`[!WARNING]` と `[!CAUTION]` は
**warning**、`[!ERROR]` と `[!DANGER]` は **error** になります。別個の "caution"
や "danger" の色はありません — これらは warning と error への alias です。

## 各 variant の render 結果

### Info — `[!INFO]`, `[!NOTE]`, `[!IMPORTANT]`

```markdown
> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.
```

> [!IMPORTANT]
> `[!INFO]`, `[!NOTE]`, and `[!IMPORTANT]` all produce this same info box.

### Tip — `[!TIP]`, `[!SUCCESS]`

```markdown
> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.
```

> [!TIP]
> `[!TIP]` and `[!SUCCESS]` both fold onto the green tip variant.

### Warning — `[!WARNING]`, `[!CAUTION]`

```markdown
> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.
```

> [!WARNING]
> `[!WARNING]` and `[!CAUTION]` both render this amber warning box.

### Error — `[!ERROR]`, `[!DANGER]`

```markdown
> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.
```

> [!DANGER]
> `[!ERROR]` and `[!DANGER]` both render this red error box.

## リッチな content と nesting

Body は通常の Markdown です — paragraphs、lists、code、links — そして callouts は
**任意の深さ**で promote されます。list items の内側でも同様で、GitHub が list
内に nest された alert を render するのとちょうど同じです（`promoteCallouts` は
children を再帰的に走査します）:

```markdown
> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```
```

> [!TIP]
> You can put **anything** in a callout:
>
> - a list item
> - a `code` span
>
> ```js
> const fenced = "code blocks too";
> ```

## doc-comment tags からの Callouts

Callouts は prose のための機能だけではありません。ある symbol を
**`@deprecated`** で document すると、theme は自動的に callout を出力します —
marker は不要です。
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts)
の `deprecationBlock` を参照してください:

```js
/**
 * @deprecated Use {@link newApi} instead.
 */
```

理由のない素の `@deprecated` は kind を考慮した既定の文
（"This method is deprecated and should not be used."）にフォールバックするので、
ボックスが空になることはありません。

description の中に **alert markers 自体** を直接書くこともできます — それらは
prose の場合とまったく同じように promote されます:

````js
/**
 * Cache statistics.
 *
 * > [!INFO]
 * > Counts reset when you call `clear()`.
 *
 * > [!WARNING]
 * > `get()` mutates recency — avoid it in hot loops.
 */
````

> [!TIP]
> live demo の **[sample-api module page](/api-docs/module/sample-api)** で、
> 実際の `@module` comment 内に書かれた `[!INFO]` callout を見てみてください —
> source は
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> にあります。

## 舞台裏

callout は capitalized な `<Callout type="…">` MDX JSX node として出力されます
（[`builders.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/builders.ts)
の `callout` builder）。rang は
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
で `Callout` → `MdxBlockquote` を register します。そのため callout と素の
markdown blockquote は 1 つの component を共有します — `type` が set されている
ときだけ typed styling へ分岐するのです。この capitalized な名前こそが、dwar
へのシリアライズの過程で variant を保持させるものです（素の `>` quote はそれを
運べません）。

## こちらも参照

- [Steps](/authoring/steps) と [Tabs](/authoring/tabs) — その他の prose
  authoring containers。
- [Embeds & live demos](/authoring/embeds) — `<Embed>` / `@iframe` について。
- [Custom tags](/authoring/custom-tags) — `@category`、`@order`、`@iframe` について。
