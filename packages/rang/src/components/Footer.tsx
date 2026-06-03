export interface FooterPkg {
  name?: string;
  repository?: string;
  homepage?: string;
}

export interface FooterProps {
  pkg?: FooterPkg;
  year?: number;
}

function normalizeRepoUrl(repo: string): string {
  // Normalize common `git+https://...` and `git@github.com:user/repo.git` forms.
  return repo
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git@github\.com:/, 'https://github.com/');
}

export function Footer({ pkg, year }: FooterProps) {
  const y = year ?? new Date().getFullYear();
  const repoUrl = pkg?.repository ? normalizeRepoUrl(pkg.repository) : undefined;
  return (
    <footer class="border-t border-[var(--clean-border)] bg-[var(--clean-bg)] py-6 text-sm text-[var(--clean-fg-muted)]">
      <div class="mx-auto flex w-full max-w-screen-2xl flex-col items-start justify-between gap-2 px-4 md:flex-row md:items-center">
        <div>
          &copy; {y} {pkg?.name ?? 'Documentation'}
        </div>
        {repoUrl && (
          <a href={repoUrl} target="_blank" rel="noreferrer noopener" class="text-[var(--clean-fg-muted)] hover:text-[var(--clean-accent)]">
            Repository
          </a>
        )}
      </div>
    </footer>
  );
}
