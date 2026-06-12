/**
 * @clean-jsdoc-theme/rang
 *
 * Preact component library + MDX component map + island registry. Provides
 * the typed components that dwar bundles for SSR and hydration.
 *
 * Components are styled with Tailwind utility classes that reference CSS
 * variables (e.g. `bg-[var(--clean-bg)]`). dwar's Phase 4 work plumbs the
 * ThemeTokens values into those variables on `:root`.
 */

/** Injected from package.json at build time (see tsup.config.ts `define`). */
declare const __PKG_VERSION__: string;
export const RANG_PACKAGE_VERSION = __PKG_VERSION__;

export { Button, buttonVariants } from './components/Button';
export type { ButtonProps } from './components/Button';

export { ButtonGroup } from './components/ButtonGroup';
export type { ButtonGroupProps } from './components/ButtonGroup';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './components/DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
} from './components/DropdownMenu';

export { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

export { cn } from './lib/cn';

export { Layout } from './components/Layout';
export type { LayoutProps, LayoutPkg } from './components/Layout';

export { Header } from './components/Header';
export type { HeaderProps, HeaderPkg } from './components/Header';

export { Footer } from './components/Footer';
export type { FooterProps, FooterPkg } from './components/Footer';

export { Brand } from './components/Brand';
export type { BrandProps } from './components/Brand';

export { Sidebar, SidebarItem } from './components/Sidebar';
export type { SidebarProps, SidebarItemProps } from './components/Sidebar';

export { MobileNav } from './components/MobileNav';
export type { MobileNavProps } from './components/MobileNav';

export { TOC } from './components/TOC';
export type { TOCProps } from './components/TOC';

export { TocPopover } from './components/TocPopover';
export type { TocPopoverProps } from './components/TocPopover';

export { CodeBlock } from './components/CodeBlock';
export type { CodeBlockProps } from './components/CodeBlock';

export { CodeTabs } from './components/CodeTabs';
export type { CodeTabsProps, CodeTab } from './components/CodeTabs';

export { CodeViewer } from './components/CodeViewer';
export type { CodeViewerProps } from './components/CodeViewer';

export { CopyBtn } from './components/CopyBtn';
export type { CopyBtnProps } from './components/CopyBtn';

export { CopyPageButton } from './components/CopyPageButton';
export type { CopyPageButtonProps } from './components/CopyPageButton';

export { PageNav } from './components/PageNav';
export type { PageNavProps, PageNavLink } from './components/PageNav';

export { ThemeToggle, useThemeMode } from './components/ThemeToggle';
export type { ThemeToggleProps } from './components/ThemeToggle';

export { CtrlK } from './components/CtrlK';
export type { CtrlKProps } from './components/CtrlK';

export { Settings, SettingsDialog } from './components/Settings';
export type { SettingsProps, SettingsDialogProps } from './components/Settings';

export { Steps, Step } from './components/Steps';
export type { StepProps } from './components/Steps';

export { Tabs, Tab } from './components/Tabs';
export type { TabProps } from './components/Tabs';

export { defaultMdxComponents } from './mdx-components';
export { HeaderSlotContext, BasePathContext, InlineSvgContext } from './components/mdx-utils';
export type { HeaderSlot } from './components/mdx-utils';
export { ISLAND_REGISTRY } from './islands';

export { useListKeyboardNav } from './hooks/use-list-keyboard-nav';
export type { ListKeyboardNav, UseListKeyboardNavOptions } from './hooks/use-list-keyboard-nav';
