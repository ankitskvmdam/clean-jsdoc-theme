# @clean-jsdoc-theme/rang

Preact component library + MDX element map + island registry for the v5 theme. dwar imports these directly to server-render pages and bundles each island as its own ESM chunk.

## What's inside

- **Chrome** — `Layout`, `Header`, `Footer`. SSR-only, no client JS.
- **Islands** — `Sidebar`, `TOC`, `CmdK`, `CodeTabs`, `CopyBtn`, `ThemeToggle`, `MobileNav`. Each renders meaningful initial HTML and progressively enhances after hydration (keyboard handling, focus trap, intersection-observer scroll-spy, drawer state, clipboard, theme persistence).
- **`defaultMdxComponents`** — element map for `@mdx-js/mdx`: headings with anchor links, external link `rel`/`target` heuristics, auto-`<CopyBtn>`-wrapped `<pre>`, table/list/quote primitives.
- **`ISLAND_REGISTRY`** — `Record<IslandName, ComponentType>` keyed by the `IslandName` union from `@clean-jsdoc-theme/utils`. The seven keys: `sidebar`, `toc`, `cmdk`, `code-tabs`, `copy-btn`, `theme-toggle`, `mobile-nav`.

## Public API

```ts
import {
  Layout,
  Header,
  Footer,
  Sidebar,
  TOC,
  CmdK,
  CodeTabs,
  CopyBtn,
  CodeBlock,
  ThemeToggle,
  MobileNav,
  defaultMdxComponents,
  ISLAND_REGISTRY,
} from '@clean-jsdoc-theme/rang';
```

Each component exports its own props type (`SidebarProps`, `TOCProps`, …). Island prop shapes match `IslandPropsMap[K]` from `@clean-jsdoc-theme/utils` exactly.

## Styling contract

Components are styled with Tailwind utility classes that reference CSS custom properties. Consumers (dwar in the default pipeline; anyone else who renders rang directly) must define these variables on `:root`:

```
--clean-bg          --clean-bg-muted
--clean-fg          --clean-fg-muted
--clean-accent      --clean-accent-fg
--clean-border
--clean-font-heading   --clean-font-body   --clean-font-mono
```

dwar's CSS pipeline plumbs `ThemeTokens` into these variables automatically. Standalone consumers need to define them themselves.

## FOUC + theme

`ThemeToggle` reads `localStorage` and `prefers-color-scheme` inside a `useEffect`, so a pre-hydration inline script is required to set `data-theme` on `<html>` before first paint. dwar inlines this script automatically. Standalone consumers should ship the equivalent.

## License

MIT.
