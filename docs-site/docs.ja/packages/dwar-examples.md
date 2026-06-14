---
title: 例
group: Packages/dwar
order: 41
---

# dwar Examples

dwar は **internal** です。通常の docs build で `render` を call することはありません
— JSDoc と TypeDoc の bridges があなたの代わりに call します。これに直接手を伸ばすのは、
*custom bridge* を build しているとき、あるいは renderer を単独で見たいときだけです。

最良の出発点は、package 自身の runnable な example: **smoke script** です。これは
`setu → dwar → disk` の path 全体を fixture に対して exercise し、実際に走る本物の
code なので、この doc の中で最も正直な example です。

単に theme を configure したいだけなら、代わりに [Configuration](/theme/configuration)
を参照してください。

## smoke script を実行する

```bash
pnpm --filter @clean-jsdoc-theme/dwar run smoke
```

[`scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
は setu の JSDoc taffy fixture を取り出し、それを `generateSite()` に通して
`SiteManifest` を取得し、manifest を dwar の `render()` に渡し、返ってきた files を
`packages/dwar/preview/` に **書き込み**、そして — `pagefind` が installed されていれば
— その directory に対して search index を build します。これは視覚的な
sanity-checking のために存在します。

end to end の flow は: **manifest in → files out → あなたがそれらを書く → preview/** です。

## `render(manifest, opts)` call

`render` は `SiteManifest` と `RenderOptions` を取ります。`RenderOptions` の唯一必須の
field は `theme` です; それ以外はすべて optional です。smoke script は minimal form を
使います
（[`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)）:

```ts
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import type { ThemeConfig } from '@clean-jsdoc-theme/dwar';
import { generateSite } from '@clean-jsdoc-theme/setu';

const theme: ThemeConfig = {
  tokens: {
    colors: { bg: '#ffffff', bgMuted: '#f3f4f6', fg: '#0f172a', /* … */ border: '#e5e7eb' },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace, monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

const manifest = generateSite(collection, { pkg: { name: 'clean-jsdoc-theme', version: '…' } });

const result = await render(manifest, { theme });
//                              ^ only `theme` is required
```

### dwar が読む `RenderOptions` fields

以下のすべての field は
[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
の `RenderOptions` にあります — 何も捏造されていません。

| Field | 必須 | 何をするか |
| --- | --- | --- |
| `theme` | **はい** | `ThemeConfig` — `tokens`（colors、fonts、shiki、`siteName`、…）、`basePath`、そして render が読む optional な `copyPage` / `pageNav` / `aiPrompt` / `customCss(File)` / `customJs(File)` の knobs。 |
| `destination` | いいえ | destination directory。path resolution context のためだけに **使われます** — dwar 自身がそこに書き込むことは決してありません。 |
| `islandCacheDir` | いいえ | esbuild island bundle 用の opt-in な on-disk cache。これを与えると warm rebuild は ~0.4s の bundle step を skip できます; 省くと `render()` は pure に保たれます。bridges は `<project>/node_modules/.cache/clean-jsdoc-theme` を pass します。 |
| `inlineSvgs` | いいえ | doc-image の `src` からその SVG の raw markup への Map。これにより rang は theme-aware な SVGs を `<img>` する代わりに inline します。bridge が files を読みます; `render()` はそれらを look up するだけです。 |

bridges はより充実した `theme` を build し（palette overrides、fonts、`copyPage`、
`pageNav`、custom CSS/JS hrefs）、4 つの options すべてを pass しますが、contract は
同じです: `theme` が必須で、残りは bridge がたまたま見つけたものです。

## `RenderResult` には何が含まれ、bridge はそれをどう persist するか

`render` は `RenderResult` に resolve します
（[`render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)）:

```ts
interface RenderResult {
  files: OutputFile[];        // { path, contents } — everything to write
  search?: SearchEntry[];     // per-page entries (the JSON index is already in `files`)
  errors?: RenderError[];     // { slug, message } — pages skipped, present only on failure
  stats: {
    pageCount: number;        // pages rendered successfully (excludes errors)
    assetCount: number;       // non-HTML files (CSS + JS chunks + search index)
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}
```

実際の purity contract: **`render()` は files を memory に返します; あなたがそれらを
書きます。** smoke script はまさにこれを行います — 素朴な write loop、それから optional
な Pagefind step
（[`smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)）:

```ts
const result = await render(manifest, { theme });

// Fresh output dir, then write every OutputFile (string or Uint8Array).
await rm(previewDir, { recursive: true, force: true });
await mkdir(previewDir, { recursive: true });
for (const file of result.files) {
  const out = resolve(previewDir, file.path);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents));
}

// Pagefind is a SEPARATE post-write step, against the written directory.
try {
  await runPagefindAgainstDir(previewDir);
} catch (err) {
  console.warn(`[smoke] pagefind skipped: ${(err as Error).message}`);
}
```

本物の bridges は同一の shape に従います。JSDoc bridge
（[`publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)）
は `render` を call し、dwar の files を *それ自身が* copy した assets（logos、custom
CSS/JS、doc images）と concatenate し、それらすべてを書き、それから Pagefind を実行します:

```ts
const result = await render(manifest, {
  theme: { ...resolveTheme(opts, siteName, fonts, basePath), ...customAssets.theme },
  destination: absoluteDestination,
  islandCacheDir,
  inlineSvgs,
});

const outputFiles = [...result.files, ...logoFiles, ...customAssets.files, ...docImageFiles];
await writeOutputFiles(absoluteDestination, outputFiles);

// Render failures are reported, never fatal.
if (result.errors && result.errors.length > 0) {
  for (const e of result.errors) console.warn(`  - ${e.slug}: ${e.message}`);
}

// Pagefind is optional — a missing/failing index must not break the build.
try {
  await runPagefindAgainstDir(absoluteDestination);
} catch (err) {
  console.warn(`pagefind step skipped (optional) — ${(err as Error).message}`);
}
```

TypeDoc bridge
（[`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)）
は ESM で同じことを行います: `render(manifest, { theme, destination, islandCacheDir })`、
それから `writeOutputFiles`、それから `runPagefindAgainstDir`。どちらも `errors` array
を warning として、Pagefind step を best-effort として扱います。

> write loop における分業に注目してください: **dwar の `result.files`** は HTML、
> 付随する `.md`、stylesheet、island chunks、そして fuzzy-search JSON です。**logos、
> custom CSS/JS、doc images** は *bridge*（I/O layer）によって copy され concatenate
> されます — だからこそ `render()` は pure に保たれ、結果として生じる hrefs を link
> するだけで済むのです。

## contract、再述

- `render(manifest, opts)` は **pure** です — files を memory に allocate して返します。
  disk に書くことは決してありません。
- **あなた** が `result.files` を destination に書きます。
- **`runPagefindAgainstDir(dir)`** は、書き込みの *後* に destination directory に対して
  call する *別個の* function です。これは package 全体で唯一の filesystem touch であり、
  optional です。

## Read the source

これらは canonical で動作する usages です — 上記のどの snippet を信じるよりも、これらを
読んでください:

- **The runnable example:**
  [`packages/dwar/scripts/smoke.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/scripts/smoke.ts)
  — `generateSite` → `render` → write loop → optional Pagefind。
- **JSDoc bridge:**
  [`packages/clean-jsdoc-theme/src/publish.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
  — `render` call、combined write、error + Pagefind handling。
- **TypeDoc bridge:**
  [`packages/typedoc/src/write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts)
  — 同じ path、完全に ESM。
- **The option + result types:**
  [`packages/utils/src/site/render.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/render.ts)
- **The entry point:**
  [`packages/dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)

## 次へ

- [dwar 概要](/packages/dwar-overview) — dwar がなぜ存在するか、purity と resilience の
  guarantees、そして `render()` が何を emit するか。
- [setu 概要](/packages/setu-overview) — `SiteManifest` がどこから来るか。
- [rang 概要](/packages/rang-overview) — dwar が page に bundle する components と
  islands。
