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
  /** Header control slot (search, language, theme, settings); rendered on the header's right. */
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
  /**
   * Author-supplied footer HTML (`opts.footer`). When set, the default `Footer`
   * is replaced by this markup; omit for the default footer.
   */
  footer?: string;
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
  footer,
}: LayoutProps) {
  return (
    <div class="flex min-h-screen flex-col bg-background text-(--clean-fg)">
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
      {/* The right-rail track is only reserved when a `toc` is supplied — pages
          without one (e.g. the source viewer) let `main` span that space.
          `flex-1` makes this region grow to fill the column, so a short page
          still pushes the footer to the bottom and `main` spans the remaining
          height (100vh − header − footer). */}
      <div
        class={`mx-auto grid w-full max-w-screen-2xl flex-1 grid-cols-1 gap-6 px-4 py-6 ${
          toc
            ? 'md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_14rem]'
            : 'md:grid-cols-[16rem_minmax(0,1fr)]'
        }`}
      >
        {sidebar && (
          <aside class="hidden md:block">
            {/* `scrollbar-gutter: stable` + a small right padding keep the scrollbar
                track clear of the nav labels (it used to overlap the text).
                Sticky offset: clear the header (h-16). On the md–lg range the mobile
                TOC bar (sticky top-16, h-12) ALSO shows above the sidebar, so when
                it's present the offset drops to top-32 (header + bar + gap) — else
                its first item hides under the bar. At lg the bar gives way to the
                right rail, so we revert to top-20. */}
            <div
              class={`sticky overflow-y-auto [scrollbar-gutter:stable] pr-2 ${
                tocMobile
                  ? 'top-32 max-h-[calc(100vh-9rem)] lg:top-20 lg:max-h-[calc(100vh-6rem)]'
                  : 'top-20 max-h-[calc(100vh-6rem)]'
              }`}
            >
              {sidebar}
            </div>
          </aside>
        )}
        <main class="min-w-0 px-4 md:px-8 lg:px-12">{children}</main>
        {toc && (
          <aside class="hidden lg:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">{toc}</div>
          </aside>
        )}
      </div>
      <Footer pkg={pkg} siteName={siteName} custom={footer} />
    </div>
  );
}
