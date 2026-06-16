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
import { PlaygroundMenu } from './components/PlaygroundMenu';
import { CopyBtn } from './components/CopyBtn';
import { CopyPageButton } from './components/CopyPageButton';
import { ThemeToggle } from './components/ThemeToggle';
import { Settings } from './components/Settings';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Tabs } from './components/Tabs';

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
  // In-content island: the loader reads `data-providers` + the page payload +
  // the sibling <pre>, then mounts `PlaygroundMenu` onto the marker.
  playground: PlaygroundMenu,
  'copy-btn': CopyBtn,
  'copy-page': CopyPageButton,
  'theme-toggle': ThemeToggle,
  settings: Settings,
  'language-switcher': LanguageSwitcher,
  // In-content island: the `Tabs` markup is fully SSR-rendered and only
  // DOM-enhanced on the client (the loader's `tabs` entry doesn't import the
  // registry), so this entry exists purely to satisfy `Record<IslandName, …>`.
  tabs: Tabs,
};
