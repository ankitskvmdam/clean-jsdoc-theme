import type { ComponentChildren } from 'preact';
import { ThemeToggle } from './ThemeToggle';
import { CmdK } from './CmdK';

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
    <header class="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--clean-border)] bg-[var(--clean-bg)] px-4 py-3">
      <div class="flex items-center gap-3">
        <a href={basePath} class="text-base font-semibold text-[var(--clean-fg)] no-underline">
          {name}
        </a>
        {pkg?.version && (
          <span class="rounded bg-[var(--clean-bg-muted)] px-2 py-0.5 text-xs text-[var(--clean-fg-muted)]">
            v{pkg.version}
          </span>
        )}
      </div>
      <div class="flex items-center gap-2">
        {children}
        <CmdK basePath={basePath} />
        <ThemeToggle />
      </div>
    </header>
  );
}
