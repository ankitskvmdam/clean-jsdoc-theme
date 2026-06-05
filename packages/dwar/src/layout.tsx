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
  CmdK,
  ThemeToggle,
  Settings,
} from '@clean-jsdoc-theme/rang';
import type { Heading, IslandName, NavNode } from '@clean-jsdoc-theme/utils';

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
  siteName?: string;
  basePath?: string;
  /** Mutated as islands are encountered so the caller can emit the props JSON. */
  islands: IslandRecord[];
}

/**
 * Wrap a Preact element with a `data-island` marker and record its props for
 * the per-page payload script. Runs during render, so ids are allocated in
 * document order.
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
  const id = `i${islands.length}`;
  islands.push({ id, name, props });
  // Preact JSX expects lowercase data-* keys; we use the proper kebab form.
  return (
    <div data-island={name} data-island-id={id}>
      <Component {...props} />
    </div>
  );
}

export function SsrLayout({
  children,
  nav = [],
  currentSlug = '',
  headings = [],
  pkg,
  siteName,
  basePath = '/',
  islands,
}: SsrLayoutProps) {
  const headerControls = (
    <>
      {/* Desktop controls: search + theme + settings. On mobile these all
          collapse into the nav drawer trigger below — the mobile header keeps
          only the panel-right button. */}
      <div class="hidden items-center gap-1 md:flex">
        <Island name="cmdk" islands={islands} Component={CmdK} props={{ basePath }} />
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

  return (
    <Layout
      siteName={siteName}
      pkg={pkg}
      basePath={basePath}
      headerControls={headerControls}
      sidebar={sidebar}
      toc={toc}
    >
      {children}
    </Layout>
  );
}
