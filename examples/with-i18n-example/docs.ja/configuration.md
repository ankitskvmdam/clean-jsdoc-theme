---
title: 設定
group: Guide
order: 2
---

# 設定

文章ページをローカライズするには、docs フォルダーの隣にロケールごとのディレクトリ
を作成し、翻訳したいファイルだけを置きます。

```
docs/                  # デフォルト言語の文書
  getting-started.md
  configuration.md
docs.ja/               # 日本語オーバーレイ
  getting-started.md
  configuration.md
docs.hi/               # ヒンディー語オーバーレイ（部分的 — 残りはフォールバック）
  getting-started.md
```

ロケールには実際に翻訳するページだけがあれば十分です。オーバーレイに無いファイルは
デフォルトの `docs/` 版にフォールバックします。
