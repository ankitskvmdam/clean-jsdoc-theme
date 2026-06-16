import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { PlaygroundProvider } from '@clean-jsdoc-theme/utils';

/**
 * The resolved playground config for the code block nested inside a
 * `<Playground>` — read by {@link CodeBlock} via {@link usePlayground}.
 */
export interface PlaygroundContextValue {
  /** Providers the block can be opened in (empty → no "Open Code in" dropdown). */
  providers: PlaygroundProvider[];
  /** Header label override (else the localized `CODE` label). */
  filename?: string;
  /** 1-based line numbers to highlight in the code body. */
  highlight: number[];
}

/**
 * Set by a `<Playground>` wrapper, consumed by the nested `CodeBlock`. `null`
 * outside a wrapper — an ordinary code block renders with no filename/highlight
 * and no dropdown.
 */
export const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

/** Read the enclosing `<Playground>` config (or `null`). */
export function usePlayground(): PlaygroundContextValue | null {
  return useContext(PlaygroundContext);
}

const KNOWN = new Set<string>(['codepen', 'jsfiddle', 'codesandbox']);

/** `"codepen jsfiddle"` → `['codepen','jsfiddle']` (known providers only). */
function parseProviders(value: string | undefined): PlaygroundProvider[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .filter((p): p is PlaygroundProvider => KNOWN.has(p));
}

/** `"1,4,8"` → `[1,4,8]` (1-based ints; junk dropped). */
function parseHighlight(value: string | undefined): number[] {
  if (!value) return [];
  const out: number[] = [];
  for (const part of value.split(',')) {
    const n = Number.parseInt(part.trim(), 10);
    if (Number.isInteger(n) && n >= 1) out.push(n);
  }
  return out;
}

export interface PlaygroundProps {
  /** Space-separated provider list (setu emits the resolved set). */
  providers?: string;
  /** Filename header label. */
  filename?: string;
  /** Comma-separated 1-based line numbers to highlight. */
  highlight?: string;
  children?: ComponentChildren;
}

/**
 * setu emits `<Playground providers="codepen jsfiddle" filename="x.js"
 * highlight="1,4,8">` wrapping a single code fence (the same capitalized-JSX
 * round-trip as `<Embed>`/`<Callout>`). This component is a **context provider
 * with no markup of its own**: it parses the stringy attributes into a
 * {@link PlaygroundContextValue} and renders its children, so the nested
 * `CodeBlock` can read the config and add the filename header, line highlight,
 * and the "Open Code in" dropdown. SSR-only — the playground island re-reads its
 * config from the DOM at hydration, so this context never crosses that boundary.
 */
export function Playground({ providers, filename, highlight, children }: PlaygroundProps) {
  const value: PlaygroundContextValue = {
    providers: parseProviders(providers),
    filename: filename && filename.trim() ? filename.trim() : undefined,
    highlight: parseHighlight(highlight),
  };
  return <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>;
}
