import { useState } from 'preact/hooks';
import { PanelRight, Sun, Moon, Settings as SettingsIcon } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import type { NavNode, SiteName } from '@clean-jsdoc-theme/utils';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Brand } from './Brand';
import { Sidebar, SidebarItem } from './Sidebar';
import { useThemeMode } from './ThemeToggle';
import { SettingsDialog } from './Settings';

export interface MobileNavProps {
  nav: NavNode[];
  currentSlug: string;
  siteName?: SiteName;
  basePath?: string;
  collapsibleGroups?: string[];
}

/**
 * Mobile navigation island. The desktop sidebar column is hidden below `md`
 * (see rang's `Layout`); this provides the same navigation behind a header
 * trigger instead.
 *
 * The trigger is a `panel-right` icon button; tapping it opens a left side
 * sheet (the `Dialog` `align="left"` variant — so the overlay, Escape,
 * click-outside, focus trap, and scroll lock are all reused, not reimplemented).
 *
 * The sheet stacks, top to bottom: the site name (matching the header), the
 * theme toggle and settings as sidebar rows, then the full page list — all
 * reused from their existing components/hooks so nothing here duplicates the
 * desktop chrome. Tapping any item closes the drawer; "Settings" also opens the
 * settings dialog, which is rendered as a sibling of the drawer so it survives
 * the drawer unmounting.
 */
export function MobileNav({
  nav,
  currentSlug,
  siteName,
  basePath = '/',
  collapsibleGroups,
}: MobileNavProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { current: themeMode, toggle: toggleTheme } = useThemeMode();
  const close = () => setOpen(false);

  // The theme icon mirrors the header toggle: shows the current mode.
  const ThemeIcon = themeMode === 'light' ? Sun : Moon;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('chrome.nav.open')}
        title={t('chrome.nav.menu')}
      >
        <PanelRight size={18} aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen} align="left" label={t('chrome.nav.drawerLabel')}>
        {/* Close the drawer whenever a link inside it is followed (site name or
            a page link). The action rows below close it via their own onClick. */}
        <div
          class="px-3 py-4"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) close();
          }}
        >
          {siteName && (
            <a href={basePath} class="mb-3 flex items-center px-3 no-underline">
              <Brand
                siteName={siteName}
                textClass="font-heading text-lg font-bold text-(--clean-fg)"
                logoClass="h-6 w-auto"
              />
            </a>
          )}
          <div class="mb-2 border-b border-border pb-2">
            <SidebarItem
              icon={<ThemeIcon size={16} aria-hidden="true" />}
              label={t('chrome.theme.toggleTitle')}
              onClick={() => {
                toggleTheme();
                close();
              }}
            />
            <SidebarItem
              icon={<SettingsIcon size={16} aria-hidden="true" />}
              label={t('chrome.settings.title')}
              onClick={() => {
                close();
                setSettingsOpen(true);
              }}
            />
          </div>
          <Sidebar
            nav={nav}
            currentSlug={currentSlug}
            basePath={basePath}
            collapsibleGroups={collapsibleGroups}
          />
        </div>
      </Dialog>
      {/* Sibling of the drawer so closing the drawer doesn't unmount it. */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
