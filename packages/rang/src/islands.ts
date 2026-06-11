import type { ComponentType } from 'preact';
import type { IslandName } from '@clean-jsdoc-theme/utils';

import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { TOC } from './components/TOC';
import { TocPopover } from './components/TocPopover';
import { CtrlK } from './components/CtrlK';
import { CodeTabs } from './components/CodeTabs';
import { CodeViewer } from './components/CodeViewer';
import { EmbedBody } from './components/Embed';
import { CopyBtn } from './components/CopyBtn';
import { CopyPageButton } from './components/CopyPageButton';
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
  cmdk: CtrlK,
  'code-tabs': CodeTabs,
  'code-viewer': CodeViewer,
  // In-content island: the loader mounts `EmbedBody` (the marker's children)
  // onto the `data-island="embed"` marker, reading config from its `data-*`.
  embed: EmbedBody,
  'copy-btn': CopyBtn,
  'copy-page': CopyPageButton,
  'theme-toggle': ThemeToggle,
  settings: Settings,
};
