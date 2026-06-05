import type { ComponentChildren } from 'preact';
import { Header } from './Header';
import { Footer } from './Footer';

export interface LayoutPkg {
  name?: string;
  version?: string;
  repository?: string;
  homepage?: string;
}

export interface LayoutProps {
  children?: ComponentChildren;
  /** Header control slot (search, theme, settings); rendered on the header's right. */
  headerControls?: ComponentChildren;
  /** Left nav slot. When omitted, the sidebar column is not rendered. */
  sidebar?: ComponentChildren;
  /** Right table-of-contents slot. When omitted, the toc column is not rendered. */
  toc?: ComponentChildren;
  pkg?: LayoutPkg;
  siteName?: string;
  basePath?: string;
}

/**
 * Page chrome shell: header + 3-column grid (sidebar · main · toc) + footer.
 *
 * Pure markup. It renders whatever nodes the caller supplies in the
 * `sidebar` / `toc` / `headerControls` slots and never references islands
 * itself. dwar wraps its island components in hydration markers and passes
 * them into these slots, so the chrome markup lives here once.
 */
export function Layout({
  children,
  headerControls,
  sidebar,
  toc,
  pkg,
  siteName,
  basePath = '/',
}: LayoutProps) {
  return (
    <div class="min-h-screen bg-[var(--clean-bg)] text-[var(--clean-fg)]">
      <Header siteName={siteName} pkg={pkg} basePath={basePath}>
        {headerControls}
      </Header>
      <div class="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
        {sidebar && (
          <aside class="hidden md:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">{sidebar}</div>
          </aside>
        )}
        <main class="min-w-0">{children}</main>
        {toc && (
          <aside class="hidden lg:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">{toc}</div>
          </aside>
        )}
      </div>
      <Footer pkg={pkg} siteName={siteName} />
    </div>
  );
}
