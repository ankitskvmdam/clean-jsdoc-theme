/**
 * SSR layout adapter. The chrome markup (header, grid shell, asides, footer)
 * lives entirely in rang's `Layout`. dwar's only job here is hydration: it
 * wraps each island component in a `<div data-island="...">` envelope, records
 * its props for the per-page payload, and hands the wrapped nodes to rang's
 * `Layout` via its `headerControls` / `sidebar` / `toc` slots.
 *
 * This is the seam that lets rang own all markup while dwar owns the island
 * markers — without either side duplicating the other's concern.
 *
 * Per-page id allocation: islands appear at most once each (cmdk, theme-toggle,
 * settings in the header; sidebar and toc in the body), and `Island` allocates
 * ids during render in tree order, so an ascending counter is sufficient.
 * Mdx-embedded islands (code-tabs, copy-btn) flow through the MDX component map
 * and are NOT marked here — they aren't part of the layout.
 */

import type { ComponentChildren, ComponentType, VNode } from 'preact';
import {
  Layout,
  Sidebar,
  MobileNav,
  TOC,
  TocPopover,
  CmdK,
  ThemeToggle,
  Settings,
} from '@clean-jsdoc-theme/rang';
import type { Heading, IslandName, NavNode, SiteName } from '@clean-jsdoc-theme/utils';

export interface IslandRecord {
  /** `i0`, `i1`, ... — referenced by the loader's data-island-id attribute. */
  id: string;
  name: IslandName;
  // Heterogeneous island prop shapes; the IslandPropsMap controls the per-name
  // shape at the call site, but at the layout level we erase to `unknown`.
  props: unknown;
}

export interface SsrLayoutProps {
  children?: ComponentChildren;
  nav?: NavNode[];
  currentSlug?: string;
  headings?: Heading[];
  pkg?: {
    name?: string;
    version?: string;
    repository?: string;
    homepage?: string;
  };
  siteName?: SiteName;
  basePath?: string;
  /** URL of the JSON search index, handed to the cmdk island for fuzzy search. */
  searchIndexUrl?: string;
  /** Mutated as islands are encountered so the caller can emit the props JSON. */
  islands: IslandRecord[];
}

/**
 * Wrap a Preact element with a `data-island` marker and record its props for
 * the per-page payload script. Runs during render, so ids are allocated in
 * document order.
 *
 * `props` is what lands in the per-page JSON payload (read by the hydration
 * chunk). `ssrProps`, when given, is what the component is rendered with for
 * SSR — letting the server-rendered markup carry data (e.g. a file body in a
 * `<pre>`) that we deliberately keep OUT of the JSON payload. Defaults to
 * `props` when omitted, which is the common case.
 */
export function renderIsland<S extends object, P extends object = S>({
  name,
  islands,
  Component,
  props,
  ssrProps,
}: {
  name: IslandName;
  islands: IslandRecord[];
  // The component is rendered with the SSR props (`S`), which are a superset of
  // the payload props (`P`) — e.g. CodeViewer's SSR shape adds `code`.
  Component: ComponentType<S>;
  props: P;
  ssrProps?: S;
}): VNode {
  const id = `i${islands.length}`;
  islands.push({ id, name, props });
  // Preact JSX expects lowercase data-* keys; we use the proper kebab form.
  return (
    <div data-island={name} data-island-id={id}>
      <Component {...(ssrProps ?? (props as unknown as S))} />
    </div>
  );
}

/**
 * Thin wrapper around `renderIsland` for layout-chrome islands whose payload
 * props and SSR props are identical. Keeps the existing call sites unchanged.
 */
function Island<P extends object>({
  name,
  islands,
  Component,
  props,
}: {
  name: IslandName;
  islands: IslandRecord[];
  Component: ComponentType<P>;
  props: P;
}): VNode {
  return renderIsland({ name, islands, Component, props });
}

export function SsrLayout({
  children,
  nav = [],
  currentSlug = '',
  headings = [],
  pkg,
  siteName,
  basePath = '/',
  searchIndexUrl,
  islands,
}: SsrLayoutProps) {
  const headerControls = (
    <>
      {/* Desktop controls: search + theme + settings. On mobile these all
          collapse into the nav drawer trigger below — the mobile header keeps
          only the panel-right button. */}
      <div class="hidden items-center gap-1 md:flex">
        <Island
          name="cmdk"
          islands={islands}
          Component={CmdK}
          props={{ basePath, ...(searchIndexUrl ? { searchIndexUrl } : {}) }}
        />
        <Island
          name="theme-toggle"
          islands={islands}
          Component={ThemeToggle}
          props={{} as Record<string, never>}
        />
        <Island
          name="settings"
          islands={islands}
          Component={Settings}
          props={{} as Record<string, never>}
        />
      </div>
      {/* Mobile-only drawer trigger; the drawer hosts theme/settings + the page list. */}
      {nav.length > 0 && (
        <div class="md:hidden">
          <Island
            name="mobile-nav"
            islands={islands}
            Component={MobileNav}
            props={{ nav, currentSlug, siteName, basePath }}
          />
        </div>
      )}
    </>
  );

  const sidebar =
    nav.length > 0 ? (
      <Island name="sidebar" islands={islands} Component={Sidebar} props={{ nav, currentSlug }} />
    ) : undefined;

  const toc =
    headings.length > 0 ? (
      <Island name="toc" islands={islands} Component={TOC} props={{ headings }} />
    ) : undefined;

  // The `< lg` counterpart to the rail, mounted in the Layout's mobile bar slot.
  const tocMobile =
    headings.length > 0 ? (
      <Island name="toc-mobile" islands={islands} Component={TocPopover} props={{ headings }} />
    ) : undefined;

  return (
    <Layout
      siteName={siteName}
      pkg={pkg}
      basePath={basePath}
      headerControls={headerControls}
      sidebar={sidebar}
      toc={toc}
      tocMobile={tocMobile}
    >
      {children}
    </Layout>
  );
}
