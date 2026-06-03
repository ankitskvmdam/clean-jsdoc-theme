/**
 * SSR Layout wrapper that marks each island invocation with a
 * `<div data-island="...">` envelope.
 *
 * We can't use rang's `Layout` directly because it embeds island components
 * (Sidebar, TOC) opaquely — there's no seam inside Layout where we can wrap
 * them. Rather than modifying rang, we mirror Layout's outer structure here and
 * re-use the island and chrome components (Header, Footer) as building blocks.
 * This is the cleanest way to keep dwar's island-marker concern out of rang.
 *
 * Per-page id allocation: islands appear at most once each in this layout
 * (cmdk, theme-toggle, settings in the header; sidebar and toc in the body),
 * so an ascending counter is sufficient. Mdx-embedded islands (code-tabs,
 * copy-btn) flow through the MDX component map and are NOT marked here — they
 * aren't part of the Layout.
 */

import type { ComponentChildren, ComponentType, VNode } from 'preact';
import { Footer, Sidebar, TOC, CmdK, ThemeToggle, Settings } from '@clean-jsdoc-theme/rang';
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
 * the per-page payload script.
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
  const name = siteName ?? pkg?.name ?? 'Documentation';
  return (
    <div class="min-h-screen bg-[var(--clean-bg)] text-[var(--clean-fg)]">
      <header class="sticky top-0 z-30 bg-[var(--clean-bg)]">
        <div class="mx-auto flex h-16 w-full min-w-0 max-w-screen-2xl items-center gap-4 px-4">
          <a href={basePath} class="text-base font-semibold text-[var(--clean-fg)] no-underline">
            {name}
          </a>
          {pkg?.version && (
            <span class="rounded bg-[var(--clean-bg-muted)] px-2 py-0.5 text-xs text-[var(--clean-fg-muted)]">
              v{pkg.version}
            </span>
          )}
          <div class="ml-auto flex items-center gap-1">
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
        </div>
      </header>
      <div class="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
        {nav.length > 0 && (
          <aside class="hidden md:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <Island
                name="sidebar"
                islands={islands}
                Component={Sidebar}
                props={{ nav, currentSlug }}
              />
            </div>
          </aside>
        )}
        <main class="min-w-0">{children}</main>
        {headings.length > 0 && (
          <aside class="hidden lg:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <Island
                name="toc"
                islands={islands}
                Component={TOC}
                props={{ headings }}
              />
            </div>
          </aside>
        )}
      </div>
      <Footer pkg={pkg} />
    </div>
  );
}

