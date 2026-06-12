---
title: Examples
group: Packages/rang
order: 31
---

# Using `@clean-jsdoc-theme/rang`

> **Be honest with yourself first:** `@clean-jsdoc-theme/rang` is an internal,
> browser-side building block that [dwar](/packages/dwar-overview) consumes. You
> don't wire it up yourself — dwar imports it, server-renders its components, and
> bundles the islands for hydration. You'd reach into rang directly only when
> you're **contributing to the theme** or writing a **component override**. If
> you just want docs, install an [entry point](/#the-packages) and set
> [options](/theme/configuration) instead.

Everything ships from the single package entry — `package.json` exposes only
`.`, so all imports look like this:

```tsx
import { Layout, Button, cn, defaultMdxComponents, ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';
import type { LayoutProps, ButtonProps } from '@clean-jsdoc-theme/rang';
```

The authoritative export list is
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts).

## The public exports, grouped

These are the things a consumer or contributor actually reaches for, all from
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts):

```tsx
// shadcn-style primitives
import {
  Button, buttonVariants, ButtonGroup,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
  Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@clean-jsdoc-theme/rang';

// chrome (static SSR shell) + brand
import { Layout, Header, Footer, Brand } from '@clean-jsdoc-theme/rang';

// islands (interactive; hydrated by dwar)
import {
  Sidebar, SidebarItem, MobileNav, TOC, TocPopover,
  CtrlK, Settings, SettingsDialog, ThemeToggle, useThemeMode,
  CodeTabs, CopyBtn, CopyPageButton, CodeViewer,
} from '@clean-jsdoc-theme/rang';

// SSR-only doc components (NOT islands)
import { Steps, Step, Tabs, Tab, PageNav, CodeBlock } from '@clean-jsdoc-theme/rang';

// the registries + the class helper + MDX contexts
import {
  defaultMdxComponents, ISLAND_REGISTRY, cn,
  HeaderSlotContext, BasePathContext, InlineSvgContext,
} from '@clean-jsdoc-theme/rang';
```

The `cn()` helper is the same shadcn class-merge you'd use inside any component —
it composes conditional classes (`clsx`) and resolves conflicting Tailwind
utilities so a caller's class wins
([`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)):

```tsx
import { cn } from '@clean-jsdoc-theme/rang';

// the caller's `bg-red-500` overrides the default `bg-background`
cn('bg-background px-3 py-2', isError && 'bg-red-500');
```

## How an MDX element maps to a component

dwar compiles each page's MDX and renders it with rang's `defaultMdxComponents`.
The map is just element-name → component
([`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)):

```tsx
import { defaultMdxComponents } from '@clean-jsdoc-theme/rang';

// intrinsic tags MDX emits are styled by rang renderers:
defaultMdxComponents['h2'];   // makeHeading('h2') — heading + hover anchor link
defaultMdxComponents['pre'];  // CodeBlock — shiki-highlighted block + copy button
defaultMdxComponents['code']; // inline <code>

// capitalized components setu emits route through the SAME map:
defaultMdxComponents['Callout'];   // a typed blockquote (e.g. @deprecated)
defaultMdxComponents['Embed'];     // renders the data-island="embed" marker
defaultMdxComponents['Tabs'];      // SSR tablist that dwar enhances on the client
defaultMdxComponents['MemberHeading'];
```

So a markdown blockquote with a `type` and setu's `<Callout type="…">` both land
on the same renderer, and a fenced code block becomes a highlighted `CodeBlock`.
You can see the user-facing side of these in the authoring docs:
[Callouts](/authoring/callouts) and [Tabs](/authoring/tabs).

dwar merges this map with any override before rendering — its `mergeMdxComponents`
spreads `defaultMdxComponents` first, then the override on top
([`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)).

## The island pattern: SSR first, then hydrate

An island is a component that renders as plain HTML on the server, then gets a
small JS chunk that hydrates *only that subtree*. Two pieces make it work:

**1. rang registers the name → component** in `ISLAND_REGISTRY`
([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)):

```tsx
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

ISLAND_REGISTRY['sidebar'];      // Sidebar
ISLAND_REGISTRY['cmdk'];         // CtrlK (the Ctrl-K command palette)
ISLAND_REGISTRY['theme-toggle']; // ThemeToggle
// full set: sidebar, mobile-nav, toc, toc-mobile, cmdk, code-tabs,
// code-viewer, embed, copy-btn, copy-page, theme-toggle, settings, tabs
```

**2. dwar mounts each island** by wrapping the component in a `data-island`
marker during SSR
([`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)).
Its `renderIsland` records the props for the per-page payload and emits the
marker:

```tsx
// dwar/src/layout.tsx (paraphrased)
function renderIsland({ name, islands, Component, props, ssrProps }) {
  const id = `i${islands.length}`;
  islands.push({ id, name, props });        // recorded for the hydration payload
  return (
    <div data-island={name} data-island-id={id}>
      <Component {...(ssrProps ?? props)} />  {/* real SSR markup inside */}
    </div>
  );
}
```

dwar then drops those wrapped nodes into rang's `Layout` slots (`headerControls`,
`sidebar`, `toc`, `tocMobile`) — it adds no chrome of its own. At bundle time,
[`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
builds one esbuild bundle with every island as an entry, hoisting Preact + rang's
registry into a single shared chunk. In the browser, dwar's loader finds each
`data-island="…"` element and hydrates the matching component from
`ISLAND_REGISTRY` with the recorded props.

Note the in-content islands: `embed` mounts `EmbedBody` onto the marker and reads
config from its `data-*`, and `tabs` is fully SSR-rendered markup that the loader
only DOM-*enhances* (it doesn't import the registry for `tabs`). Both details are
documented in
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts).

## Component overrides: a partially-wired feature — be honest

`ComponentOverrides` lives in
[`utils/src/site/theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
and is handed to dwar as `theme.components`:

```ts
export interface ComponentOverrides {
  Sidebar?: Override<unknown>;
  TOC?: Override<unknown>;
  Header?: Override<unknown>;
  Footer?: Override<unknown>;
  Layout?: Override<unknown>;
  // MDX component map — keys are MDX element names (e.g. `h1`, `code`, `Callout`).
  mdxComponents?: Record<string, ComponentType<any>>;
}
```

Only **one field is actually wired today: `mdxComponents`.** dwar's
`mergeMdxComponents` reads `theme.components?.mdxComponents` and merges it over
`defaultMdxComponents`
([`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)):

```ts
// supplying your own renderer for a fenced code block, for example:
const theme = {
  /* …tokens… */
  components: {
    mdxComponents: {
      pre: MyCustomCodeBlock,   // overrides rang's default `pre` renderer
    },
  },
};
```

The other fields — `Sidebar`, `TOC`, `Header`, `Footer`, `Layout` — are **types
with no consuming code in dwar yet**. A repo-wide search for them in
`packages/dwar/src` finds no reads; `SsrLayout` always composes rang's own
`Layout`, `Sidebar`, `TOC`, etc. So today, setting them has no effect — treat
them as a reserved, forward-looking surface, not a working override point.

## Next

- [rang Overview](/packages/rang-overview) — the chrome-vs-island model and why
  the package exists.
- [dwar Overview](/packages/dwar-overview) — the package that server-renders and
  bundles these components.
- [Callouts](/authoring/callouts) · [Tabs](/authoring/tabs) — the user-facing
  side of the MDX components above.
