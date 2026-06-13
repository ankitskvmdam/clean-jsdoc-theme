import { Check, Globe } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { buttonVariants } from './Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './DropdownMenu';
import { cn } from '../lib/cn';

/** One selectable locale in the switcher. */
export interface LanguageOption {
  /** Locale code, e.g. `'en'`, `'fr'`. */
  code: string;
  /** Display label for the menu row, e.g. `'English'`, `'Français'`. */
  label: string;
  /**
   * URL of THIS page in that locale. The switcher is navigation, not a runtime
   * toggle — each locale is its own statically-rendered site, so picking one is
   * a link to its URL. The cross-locale index that computes these hrefs lives in
   * aadesh (Phase 3); rang only renders the list it's handed.
   */
  href: string;
}

export interface LanguageSwitcherProps {
  /** The locales this page exists in (already filtered by the cross-locale index). */
  locales: LanguageOption[];
  /** The active locale code, marked with a check and rendered non-navigable. */
  current: string;
}

/**
 * The language switcher: a globe-triggered dropdown of links to the current
 * page in each available locale. It sits in the header controls beside
 * `ThemeToggle` and inside the mobile-nav drawer. Because locale is a build
 * dimension (each locale is a separate static site), this is a *navigation*
 * control — every option is an `<a href>`, never a live DOM swap.
 *
 * Renders nothing when there's only one locale (the common, no-i18n case), so
 * a default build never shows an empty switcher.
 */
export function LanguageSwitcher({ locales, current }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  if (locales.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        aria-label={t('chrome.language.label')}
        title={t('chrome.language.label')}
      >
        <Globe size={18} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" label={t('chrome.language.label')}>
        {locales.map((locale) => {
          const isCurrent = locale.code === current;
          return (
            // The active locale links to itself (harmless) but shows the check;
            // the others navigate to their per-locale URL.
            <DropdownMenuItem key={locale.code} href={locale.href}>
              <span class="flex-1">{locale.label}</span>
              {isCurrent ? (
                <Check size={16} aria-hidden="true" class="text-(--clean-accent)" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
