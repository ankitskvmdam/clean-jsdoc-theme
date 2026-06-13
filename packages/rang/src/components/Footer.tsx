import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import type { SiteName } from '@clean-jsdoc-theme/utils';
import { Brand } from './Brand';

export interface FooterPkg {
  name?: string;
  repository?: string;
  homepage?: string;
}

export interface FooterProps {
  pkg?: FooterPkg;
  /** Site name or logo; takes precedence over `pkg.name` (mirrors the header). */
  siteName?: SiteName;
  year?: number;
}

function normalizeRepoUrl(repo: string): string {
  // Normalize common `git+https://...` and `git@github.com:user/repo.git` forms.
  return repo
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git@github\.com:/, 'https://github.com/');
}

export function Footer({ pkg, siteName, year }: FooterProps) {
  const { t } = useTranslation();
  const y = year ?? new Date().getFullYear();
  const repoUrl = pkg?.repository ? normalizeRepoUrl(pkg.repository) : undefined;
  return (
    <footer class="border-t border-(--clean-border) bg-background py-6 text-sm text-muted-foreground">
      <div class="mx-auto flex w-full max-w-screen-2xl flex-col items-start justify-between gap-2 px-4 md:flex-row md:items-center">
        <div class="flex items-center gap-1.5">
          <Brand siteName={siteName} fallback={pkg?.name} logoClass="h-5 w-auto" />
          <span>&copy; {y}</span>
        </div>
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer noopener"
            class="text-muted-foreground hover:text-accent"
          >
            {t('chrome.footer.repository')}
          </a>
        )}
      </div>
    </footer>
  );
}
