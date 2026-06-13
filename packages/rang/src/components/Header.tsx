import type { ComponentChildren } from 'preact';
import type { SiteName } from '@clean-jsdoc-theme/utils';
import { Brand } from './Brand';

export interface HeaderPkg {
  name?: string;
  version?: string;
  repository?: string;
  homepage?: string;
}

export interface HeaderProps {
  siteName?: SiteName;
  pkg?: HeaderPkg;
  basePath?: string;
  children?: ComponentChildren;
  /**
   * Content rendered immediately after the brand, on ALL breakpoints (e.g. the
   * language switcher) — distinct from `children` (the right-aligned controls
   * that collapse into the mobile drawer). `shrink-0` so it never squeezes; the
   * brand title truncates instead when space is tight.
   */
  start?: ComponentChildren;
}

export function Header({ siteName, pkg, basePath = '/', children, start }: HeaderProps) {
  return (
    <header class="sticky top-0 z-30 border-b border-(--clean-border) bg-background">
      <div class="mx-auto flex h-16 w-full min-w-0 max-w-screen-2xl items-center gap-4 px-4">
        {/* min-w-0 lets the brand shrink so a long text title truncates (below)
            rather than pushing the controls off-screen on a narrow viewport. */}
        <a href={basePath} class="flex min-w-0 items-center pl-3 no-underline">
          <Brand
            siteName={siteName}
            fallback={pkg?.name}
            // `truncate` ellipsizes a long text title; harmless on the logo variant.
            textClass="truncate text-lg font-heading font-bold text-(--clean-fg)"
            logoClass="h-6 w-auto lg:h-8"
            // Freeform Tailwind passthrough for the logo wrapper. Swap for any
            // classes you like — rerun dwar's build-css so they land in the
            // generated utility layer (it scans this source).
            containerClass="flex items-center rounded-lg p-1.5"
          />
        </a>
        {start && <div class="flex shrink-0 items-center">{start}</div>}
        {pkg?.version && (
          <span class="shrink-0 rounded bg-(--clean-bg-muted) px-2 py-0.5 text-xs text-muted-foreground">
            v{pkg.version}
          </span>
        )}
        {children && <div class="ml-auto flex shrink-0 items-center gap-1">{children}</div>}
      </div>
    </header>
  );
}
