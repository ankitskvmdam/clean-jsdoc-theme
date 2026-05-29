# @clean-jsdoc-theme/dwar

Pure SiteManifest → HTML/CSS/JS renderer. Compiles MDX through Preact components from `@clean-jsdoc-theme/rang`, server-renders each page, bundles the seven islands as ESM chunks via esbuild, emits CSS, and provides a separate post-write Pagefind step.

## Public API

- `render(manifest, opts): Promise<RenderResult>` — pure async function returning an in-memory `RenderResult` (`OutputFile[]`, `SearchEntry[]`, `stats`). Callers persist the files themselves.
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
      fonts: { heading: 'IBM Plex Serif', body: 'IBM Plex Sans', mono: 'ui-monospace' },
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

- `<slug>/index.html` per `Page`. Each `<head>` includes a pre-hydration theme script (before the stylesheet link) to prevent FOUC, plus the inline islands loader.
- `_assets/styles.${buildId}.css` — combined theme-variable layer (from `ThemeTokens`) + static utility layer covering rang's class surface.
- `_islands/<name>.js` per `IslandName` — esbuild-bundled ESM chunks (Preact inlined per chunk).
- Per-page `<script data-island-props>{ "i0": …, "i1": …, … }</script>` carrying serialized island props.
- `RenderResult.search` — one `SearchEntry` per non-hidden page, ready for downstream indexing.

## Pipeline placement

```
SiteManifest ──► dwar.render ──► OutputFile[] ──► caller writes ──► runPagefindAgainstDir
                     │
                     ├── MDX via @mdx-js/mdx + rang.defaultMdxComponents
                     ├── SSR via preact-render-to-string + rang.Layout
                     ├── Island markers wrapping rang.ISLAND_REGISTRY entries
                     ├── Islands bundle via esbuild
                     └── CSS variables from ThemeTokens + static utility layer
```

## Notes

- `render()` is **pure**: no `fs`, no `process.cwd`, no logging. Persistence is the caller's responsibility; `runPagefindAgainstDir` is the only function in this package that touches disk.
- The CSS layer is a static, hand-rolled utility set rather than full Tailwind v4. The rationale and the path to a future `compileStylesForDir` post-write step (mirroring the Pagefind pattern) are documented in `src/css.ts`.
- A defensive `{@link Foo}` → ``` `@link Foo` ``` preprocessor in `src/mdx.ts` shields the MDX parser until setu lands its URL-resolution pass; remove once that pass exists.

## License

MIT.
