# @clean-jsdoc-theme/dwar

Pure SiteManifest → HTML/CSS/JS renderer. Compiles MDX through Preact components
from `@clean-jsdoc-theme/rang`, server-renders each page, bundles each island as
its own ESM chunk via esbuild, emits CSS, and provides a separate post-write
Pagefind step.

## Public API

- `render(manifest, opts): Promise<RenderResult>` — pure async function returning an in-memory `RenderResult` (`OutputFile[]`, `SearchEntry[]`, `errors`, `stats`). Callers persist the files themselves. A page that fails to compile is skipped and reported in `RenderResult.errors`, never thrown.
- `runPagefindAgainstDir(destination): Promise<void>` — post-write step that builds the Pagefind search index against the on-disk HTML output.

## Usage

```ts
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import { generateSite } from '@clean-jsdoc-theme/setu';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const manifest = generateSite(saltyCollection);

const result = await render(manifest, {
  theme: {
    tokens: {
      colors: {
        bg: '#ffffff', bgMuted: '#f5f5f5',
        fg: '#111111', fgMuted: '#666666',
        accent: '#0070f3', accentFg: '#ffffff',
        border: '#e5e5e5',
      },
      fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'ui-monospace' },
      shiki: { light: 'github-light', dark: 'github-dark' },
      siteName: 'My Docs',
    },
    basePath: '/',
  },
});

const outDir = './dist';
for (const file of result.files) {
  const target = join(outDir, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.contents);
}

await runPagefindAgainstDir(outDir);
```

## What `render()` emits

- `<slug>/index.html` per `Page`. Each `<head>` includes a pre-hydration theme script (before the stylesheet link) to prevent FOUC; the inline heading-anchors + islands loader scripts run before `</body>`.
- `_assets/styles.${buildId}.css` — the per-theme `:root` / `[data-theme="dark"]` token block plus the prebuilt static utility layer.
- `_islands/<name>.js` per `IslandName` — esbuild-bundled ESM chunks (Preact inlined per chunk).
- Per-page `<script data-island-props>{ "i0": …, "i1": …, … }</script>` carrying serialized island props.
- `RenderResult.search` — one `SearchEntry` per non-hidden page, ready for downstream indexing.

`kind: 'source'` pages skip MDX entirely: the raw source stays in the SSR `<pre>`
(off the JSON payload) and the `code-viewer` island lazy-loads Monaco from a CDN
to enhance it.

## Pipeline placement

```
SiteManifest ──► dwar.render ──► OutputFile[] ──► caller writes ──► runPagefindAgainstDir
                     │
                     ├── MDX via @mdx-js/mdx + rang.defaultMdxComponents
                     ├── SSR via preact-render-to-string + rang.Layout
                     ├── Island markers wrapping rang.ISLAND_REGISTRY entries
                     ├── Islands bundled via esbuild (one ESM chunk per island)
                     └── CSS: per-theme token block + prebuilt utility layer
```

## Notes

- `render()` is **pure**: no `fs`, no `process.cwd`, no logging. Persistence is the caller's responsibility; `runPagefindAgainstDir` is the only function in this package that touches disk.
- **CSS is compiled once at dwar's own build time.** `scripts/build-css.mjs` runs the Tailwind v4 CLI over rang's + dwar's source and inlines the result into `src/generated/utility-css.ts`. Tailwind never runs at the consumer's `jsdoc` build, so `render()` stays pure and users need no Tailwind config; only the `:root` / `[data-theme="dark"]` token block is emitted per `ThemeConfig` at render time.
- A defensive `{@link Foo}` → `` `@link Foo` `` preprocessor in `src/mdx.ts` is kept as a safety net. setu now resolves links upstream, so only genuinely-unresolvable tags reach this code, where the inline-code fallback keeps the page compiling.

## License

MIT.
