/**
 * `llms.txt` contract — the resolved config the bridges hand dwar.
 *
 * Lives here (the setu→dwar boundary) rather than in `config/` so
 * `RenderOptions` can reference it without `site/` importing from `config/` —
 * `config/` already imports `site/`, and the reverse would close a module cycle.
 */
import type { PageKind } from './page';

/** Resolved `llmsTxt` options — every field defaulted by `validateLlmsTxt`. */
export interface LlmsTxtConfig {
  /** Also emit `llms-full.txt` (every page's Markdown concatenated). */
  full: boolean;
  /**
   * How API-reference pages are treated. `true` lists them with descriptions and
   * includes their bodies in `llms-full.txt`; `'index'` lists them as a bare
   * index (no descriptions) and omits their bodies from `llms-full.txt`; `false`
   * omits them from both files.
   */
  api: boolean | 'index';
}

/**
 * Page kinds that count as API reference — everything setu derives from doclets.
 * `index`/`guide` (home, README, docs, tutorials) and `source` are NOT API.
 */
export const API_PAGE_KINDS: readonly PageKind[] = [
  'class',
  'module',
  'namespace',
  'mixin',
  'interface',
  'typedef',
  'enum',
  'function',
  'variable',
  'global',
];
