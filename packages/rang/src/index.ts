/**
 * @clean-jsdoc-theme/rang
 *
 * Preact component library + MDX component map + island registry. Phase 1
 * ships type-correct placeholders so dwar can import them without crashing
 * its build; real implementations land in Phase 3.
 */

// Phase 1 placeholders use ComponentType<any> intentionally — Phase 3 replaces
// each with its real typed signature.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ComponentType } from 'preact';
import type { IslandName } from '@clean-jsdoc-theme/utils';

export const RANG_PACKAGE_VERSION = '5.0.0-alpha.0';

// --- Layout / chrome components -----------------------------------------

/** Page layout that wraps every rendered page. */
export const Layout: ComponentType<any> = null as unknown as ComponentType<any>;

/** Sidebar (nav tree). */
export const Sidebar: ComponentType<any> = null as unknown as ComponentType<any>;

/** Table-of-contents column. */
export const TOC: ComponentType<any> = null as unknown as ComponentType<any>;

/** Site header. */
export const Header: ComponentType<any> = null as unknown as ComponentType<any>;

/** Site footer. */
export const Footer: ComponentType<any> = null as unknown as ComponentType<any>;

// --- Code / interactive primitives --------------------------------------

/** Syntax-highlighted code block (Shiki). */
export const CodeBlock: ComponentType<any> = null as unknown as ComponentType<any>;

/** Tabbed code blocks (e.g. JS / TS variants). */
export const CodeTabs: ComponentType<any> = null as unknown as ComponentType<any>;

/** Copy-to-clipboard button. */
export const CopyBtn: ComponentType<any> = null as unknown as ComponentType<any>;

/** Light/dark theme toggle. */
export const ThemeToggle: ComponentType<any> = null as unknown as ComponentType<any>;

/** Cmd-K command palette. */
export const CmdK: ComponentType<any> = null as unknown as ComponentType<any>;

// --- MDX + island wiring -------------------------------------------------

/**
 * Default MDX element-name → component map. Consumers can spread + override
 * via `ThemeConfig.components.mdxComponents`.
 */
export const defaultMdxComponents: Record<string, ComponentType<any>> =
  null as unknown as Record<string, ComponentType<any>>;

/**
 * Registry mapping every `IslandName` to the component that renders it
 * (both for SSR and hydration). Phase 3 will populate this with real
 * components; Phase 1 keeps the shape so dwar's bundler entry points compile.
 */
export const ISLAND_REGISTRY: Record<IslandName, ComponentType<any>> =
  null as unknown as Record<IslandName, ComponentType<any>>;
