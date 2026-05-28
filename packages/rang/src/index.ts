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

export const RANG_PACKAGE_VERSION = '5.0.0-alpha.0';

export { Layout } from './components/Layout';
export type { LayoutProps, LayoutPkg } from './components/Layout';

export { Header } from './components/Header';
export type { HeaderProps, HeaderPkg } from './components/Header';

export { Footer } from './components/Footer';
export type { FooterProps, FooterPkg } from './components/Footer';

export { Sidebar } from './components/Sidebar';
export type { SidebarProps } from './components/Sidebar';

export { TOC } from './components/TOC';
export type { TOCProps } from './components/TOC';

export { CodeBlock } from './components/CodeBlock';
export type { CodeBlockProps } from './components/CodeBlock';

export { CodeTabs } from './components/CodeTabs';
export type { CodeTabsProps, CodeTab } from './components/CodeTabs';

export { CopyBtn } from './components/CopyBtn';
export type { CopyBtnProps } from './components/CopyBtn';

export { ThemeToggle } from './components/ThemeToggle';
export type { ThemeToggleProps } from './components/ThemeToggle';

export { CmdK } from './components/CmdK';
export type { CmdKProps } from './components/CmdK';

export { MobileNav } from './components/MobileNav';
export type { MobileNavProps } from './components/MobileNav';

export { defaultMdxComponents } from './mdx-components';
export { ISLAND_REGISTRY } from './islands';
