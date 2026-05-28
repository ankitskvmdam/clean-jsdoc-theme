import type { ComponentChildren } from 'preact';
import type { Heading, NavNode } from '@clean-jsdoc-theme/utils';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { TOC } from './TOC';
import { MobileNav } from './MobileNav';

export interface LayoutPkg {
  name?: string;
  version?: string;
  repository?: string;
  homepage?: string;
}

export interface LayoutProps {
  children?: ComponentChildren;
  nav?: NavNode[];
  currentSlug?: string;
  headings?: Heading[];
  pkg?: LayoutPkg;
  siteName?: string;
  basePath?: string;
}

export function Layout({
  children,
  nav = [],
  currentSlug = '',
  headings = [],
  pkg,
  siteName,
  basePath = '/',
}: LayoutProps) {
  return (
    <div class="min-h-screen bg-[var(--clean-bg)] text-[var(--clean-fg)]">
      <Header siteName={siteName} pkg={pkg} basePath={basePath}>
        {nav.length > 0 && <MobileNav nav={nav} currentSlug={currentSlug} />}
      </Header>
      <div class="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
        {nav.length > 0 && (
          <aside class="hidden md:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <Sidebar nav={nav} currentSlug={currentSlug} />
            </div>
          </aside>
        )}
        <main class="min-w-0">{children}</main>
        {headings.length > 0 && (
          <aside class="hidden lg:block">
            <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <TOC headings={headings} />
            </div>
          </aside>
        )}
      </div>
      <Footer pkg={pkg} />
    </div>
  );
}
