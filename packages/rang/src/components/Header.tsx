import type { ComponentChildren } from 'preact';

export interface HeaderPkg {
  name?: string;
  version?: string;
  repository?: string;
  homepage?: string;
}

export interface HeaderProps {
  siteName?: string;
  pkg?: HeaderPkg;
  basePath?: string;
  children?: ComponentChildren;
}

export function Header({ siteName, pkg, basePath = '/', children }: HeaderProps) {
  const name = siteName ?? pkg?.name ?? 'Documentation';
  return (
    <header class="sticky top-0 z-30 border-b border-(--clean-border) bg-background">
      <div class="mx-auto flex h-16 w-full min-w-0 max-w-screen-2xl items-center gap-4 px-4">
        <a
          href={basePath}
          class="pl-3 text-lg font-heading font-semibold text-(--clean-fg) no-underline"
        >
          {name}
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
