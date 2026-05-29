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
    <header class="sticky top-0 z-30 flex h-16 min-w-0 items-center bg-[var(--clean-bg)] px-4 lg:px-12">
      <div class="relative flex h-full min-w-0 flex-1 items-center gap-4 border-b border-[var(--clean-border)]">
        <a href={basePath} class="text-base font-semibold text-[var(--clean-fg)] no-underline">
          {name}
        </a>
        {pkg?.version && (
          <span class="rounded bg-[var(--clean-bg-muted)] px-2 py-0.5 text-xs text-[var(--clean-fg-muted)]">
            v{pkg.version}
          </span>
        )}
        {children && <div class="ml-auto">{children}</div>}
      </div>
    </header>
  );
}
