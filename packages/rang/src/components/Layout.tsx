import type { ComponentChildren } from 'preact';
import type { SiteName } from '@clean-jsdoc-theme/utils';
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
  /**
   * Mobile table-of-contents slot — a bar shown below the header under `lg`,
   * where the right-rail `toc` column is hidden. When omitted, nothing renders.
   */
  tocMobile?: ComponentChildren;
  pkg?: LayoutPkg;
  siteName?: SiteName;
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
  tocMobile,
  pkg,
  siteName,
  basePath = '/',
}: LayoutProps) {
  return (
    <div class="min-h-screen bg-background text-(--clean-fg)">
      <Header siteName={siteName} pkg={pkg} basePath={basePath}>
        {headerControls}
      </Header>
      {/* Mobile TOC bar: sticky just under the header (h-16 → top-16), below the
          header's z-30. Hidden once the right rail takes over at `lg`. */}
      {tocMobile && (
        <div class="sticky top-16 z-20 border-b border-(--clean-border) bg-background/80 backdrop-blur-sm lg:hidden">
          {tocMobile}
        </div>
      )}
      <div class="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
        {sidebar && (
          <aside class="hidden md:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">{sidebar}</div>
          </aside>
        )}
        <main class="min-w-0 px-4 md:px-8 lg:px-12">{children}</main>
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
