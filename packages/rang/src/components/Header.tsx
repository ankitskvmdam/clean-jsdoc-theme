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
}

export function Header({ siteName, pkg, basePath = '/', children }: HeaderProps) {
  return (
    <header class="sticky top-0 z-30 border-b border-(--clean-border) bg-background">
      <div class="mx-auto flex h-16 w-full min-w-0 max-w-screen-2xl items-center gap-4 px-4">
        <a href={basePath} class="flex items-center pl-3 no-underline">
          <Brand
            siteName={siteName}
            fallback={pkg?.name}
            textClass="text-lg font-heading font-bold text-(--clean-fg)"
            logoClass="h-6 w-auto lg:h-8"
            // Freeform Tailwind passthrough for the logo wrapper. Swap for any
            // classes you like — rerun dwar's build-css so they land in the
            // generated utility layer (it scans this source).
            containerClass="flex items-center rounded-lg p-1.5"
          />
        </a>
        {pkg?.version && (
          <span class="rounded bg-(--clean-bg-muted) px-2 py-0.5 text-xs text-muted-foreground">
            v{pkg.version}
          </span>
        )}
        {children && <div class="ml-auto flex items-center gap-1">{children}</div>}
      </div>
    </header>
  );
}
