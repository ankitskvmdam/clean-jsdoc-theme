# @clean-jsdoc-theme/rang

Preact component library + MDX element map + island registry for the v5 theme.
dwar imports these directly to server-render pages and bundles each island as its
own ESM chunk. rang owns every byte of page-shell HTML.

## What's inside

- **Chrome** — `Layout`, `Header`, `Footer`, `Brand`. SSR-only, no client JS of their own.
- **Islands** — `Sidebar`, `MobileNav`, `TOC`, `TocPopover`, `CtrlK`, `CodeTabs`, `CopyBtn`, `CopyPageButton`, `ThemeToggle`, `Settings`, `LanguageSwitcher`, `CodeViewer`, `Embed`, `PlaygroundMenu`, `Tabs`. Each renders meaningful initial HTML and progressively enhances after hydration (keyboard handling, focus trap, scroll-spy, drawer state, clipboard, theme/setting persistence, locale navigation, a sandboxed iframe, a CDN-loaded Monaco source viewer, an "Open Code in" CodePen/JSFiddle/CodeSandbox dropdown).
- **SSR-only render helpers** — `Steps`/`Step` (numbered stepper), `PageNav` (prev/next pager), `Playground` (a no-markup context carrier whose `filename`/`highlight`/`providers` the `CodeBlock` reads). These emit no island of their own.
- **Primitives** — shadcn-style `Button` (`buttonVariants`), `ButtonGroup` (segmented/split buttons), `DropdownMenu` (compound root/trigger/content/item/…), `Dialog` (+ `DialogHeader`/`DialogTitle`/`DialogBody`/`DialogFooter`), `CodeBlock` (a code-block header — `CODE`/filename label, copy, and the playground dropdown), `SimpleIcon` (Simple-Icons CSS-mask glyph), and the `cn` class-merge helper.
- **`defaultMdxComponents`** — element map for `@mdx-js/mdx`: headings with hover anchor links, external-link `rel`/`target` heuristics, `<CopyBtn>`-wrapped code blocks, table/list/quote primitives, and the `<Callout>` / `<Steps>` / `<Tabs>` / `<Embed>` / `<Playground>` elements.
- **`ISLAND_REGISTRY`** — `Record<IslandName, ComponentType>` keyed by the `IslandName` union from `@clean-jsdoc-theme/utils`. The fifteen keys: `sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`, `code-tabs`, `code-viewer`, `embed`, `playground`, `copy-btn`, `copy-page`, `theme-toggle`, `settings`, `language-switcher`, `tabs`.
- **i18n seam** — rang re-exports bhasha's `LanguageProvider` / `useTranslation` / `createI18n` so dwar can wrap each hydration root and seed it from the locale payload without a separate bhasha import. Every chrome/island string goes through `t(key)`; `LanguageSwitcher` renders nothing for a single locale.

`toc` (the curved right rail) and `toc-mobile` (`TocPopover`, the `< lg`
progress bar) are two presentations of the same headings; `mobile-nav` composes
the theme toggle, settings, and sidebar into a `< md` drawer. `embed` and `tabs`
are in-content islands (`embed` hydrates a sandboxed iframe; `tabs` is
SSR-rendered and only DOM-enhanced).

## Public API

```ts
import {
  // chrome
  Layout,
  Header,
  Footer,
  Brand,
  // islands
  Sidebar,
  MobileNav,
  TOC,
  TocPopover,
  CtrlK,
  CodeTabs,
  CopyBtn,
  CopyPageButton,
  ThemeToggle,
  useThemeMode,
  Settings,
  SettingsDialog,
  LanguageSwitcher,
  CodeViewer,
  // SSR render helpers + MDX containers
  Steps,
  Step,
  Tabs,
  Tab,
  PageNav,
  CodeBlock,
  // primitives
  Button,
  buttonVariants,
  ButtonGroup,
  DropdownMenu,
  Dialog,
  cn,
  // MDX map + registry
  defaultMdxComponents,
  ISLAND_REGISTRY,
  // i18n seam (re-exported from bhasha)
  LanguageProvider,
  useTranslation,
  createI18n,
} from '@clean-jsdoc-theme/rang';
```

Each component exports its own props type (`SidebarProps`, `TOCProps`, …). Island
prop shapes match `IslandPropsMap[K]` from `@clean-jsdoc-theme/utils` exactly.

## Styling contract

Components are styled with Tailwind utility classes that reference CSS custom
properties. Consumers (dwar in the default pipeline; anyone else rendering rang
directly) must define these on `:root`:

```
--clean-bg          --clean-bg-muted
--clean-fg          --clean-fg-muted
--clean-accent      --clean-accent-fg
--clean-border
--clean-font-heading   --clean-font-body   --clean-font-mono
```

The shadcn semantic aliases (`background`, `foreground`, `primary`, `muted`,
`accent`, `border`, `ring`) are mapped onto these `--clean-*` vars via `@theme`,
and a `@custom-variant dark` rebinds the `dark:` utility to `[data-theme="dark"]`
(the theme toggle's signal) rather than the OS `prefers-color-scheme`. dwar's CSS
pipeline plumbs `ThemeTokens` into these variables automatically; standalone
consumers must define them.

## FOUC + theme

`useThemeMode` (used by `ThemeToggle`) reads the stored `localStorage`
preference inside an effect, so a pre-hydration inline script is required to set
`data-theme` on `<html>` before first paint. dwar inlines this script
automatically; standalone consumers should ship the equivalent.

## License

MIT.
