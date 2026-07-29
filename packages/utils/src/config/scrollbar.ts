/**
 * Normalize the `scrollbar` opt into a {@link ScrollbarMode}. Pure and
 * dependency-free — both bridges call it and route the warnings to their own
 * logger. An unrecognized value falls back to `undefined` (dwar then defaults
 * to `styled`) with a warning.
 */

import type { ScrollbarMode } from '../site/theme';

const SCROLLBAR_MODES: readonly ScrollbarMode[] = ['styled', 'visible', 'native'];

export function normalizeScrollbar(raw: unknown): {
  value: ScrollbarMode | undefined;
  warnings: string[];
} {
  if (raw === undefined) return { value: undefined, warnings: [] };
  if (typeof raw === 'string' && (SCROLLBAR_MODES as readonly string[]).includes(raw)) {
    return { value: raw as ScrollbarMode, warnings: [] };
  }
  return {
    value: undefined,
    warnings: [
      `scrollbar must be one of ${SCROLLBAR_MODES.map((m) => `"${m}"`).join(', ')}; ` +
        `got ${JSON.stringify(raw)}. Ignoring it (using "styled").`,
    ],
  };
}
