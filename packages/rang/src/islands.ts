import type { ComponentType } from 'preact';
import type { IslandName } from '@clean-jsdoc-theme/utils';

import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { TOC } from './components/TOC';
import { TocPopover } from './components/TocPopover';
import { CmdK } from './components/CmdK';
import { CodeTabs } from './components/CodeTabs';
import { CopyBtn } from './components/CopyBtn';
import { ThemeToggle } from './components/ThemeToggle';
import { Settings } from './components/Settings';

// Island registry is intentionally heterogeneous across IslandName keys; per-key
// prop shapes are recovered at call sites via IslandPropsMap[K].
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ISLAND_REGISTRY: Record<IslandName, ComponentType<any>> = {
  sidebar: Sidebar,
  'mobile-nav': MobileNav,
  toc: TOC,
  'toc-mobile': TocPopover,
  cmdk: CmdK,
  'code-tabs': CodeTabs,
  'copy-btn': CopyBtn,
  'theme-toggle': ThemeToggle,
  settings: Settings,
};
